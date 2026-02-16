import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOfferDTO, GetOffers, OffersDashboardParams, OfferTargetDTO, UpdateOfferDTO } from './offers.dto';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserLogEvent } from 'src/audit/user-log.event';

@Injectable()
export class OffersService {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(OffersService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly cache: CacheService,
        private readonly eventEmmiter: EventEmitter2
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };


    private async resolveTargetId({ target }: { target: OfferTargetDTO }): Promise<string | null> {
        if (!target.target_uuid) return null;
        switch (target.target_type) {
            case 'PRODUCT_VERSION': {
                const version = await this.prisma.productVersion.findUnique({
                    where: { sku: target.target_uuid },
                    select: { id: true }
                });
                if (!version) throw new NotFoundException("Versión de producto no encontrada");
                return version.id;
            }
            case 'PRODUCT': {
                const product = await this.prisma.product.findUnique({
                    where: { uuid: target.target_uuid },
                    select: { id: true }
                });
                if (!product) throw new NotFoundException("Producto no encontrado");
                return product.id;
            }
            case 'CATEGORY': {
                const category = await this.prisma.category.findUnique({
                    where: { uuid: target.target_uuid },
                    select: { id: true }
                });
                if (!category) throw new NotFoundException("Categoría no encontrada");
                return category.id;
            }
            case 'SUBCATEGORY':
                return null;
            default:
                throw new BadRequestException("Tipo de objetivo no válido");
        }
    };

    async create({ data, userUUID }: { data: CreateOfferDTO, userUUID: string }) {
        const { target, ...offerData } = data;
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUUID },
            select: { id: true }
        });
        if (!user) throw new NotFoundException("No se encontro el usuario");

        const targetId = await this.resolveTargetId({ target }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al resolver el target_id");
            throw new BadRequestException("Error al resolver el target_id");
        });

        const offerUUID = await this.prisma.$transaction(async (tx) => {
            const offer = await tx.offers.create({
                data: { ...offerData, user_id: user.id },
                select: { id: true, uuid: true }
            });
            await tx.offerTarget.create({
                data: {
                    target_type: target.target_type,
                    target_id: targetId,
                    target_uuid_path: target.target_uuid_path && target.target_uuid_path.length > 0
                        ? target.target_uuid_path
                        : [],
                    offer_id: offer.id
                }
            });
            return offer.uuid
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al crear la oferta");
            throw new BadRequestException("Error al crear la oferta");
        });

        await this.cache.invalidateMultipleEntities([
            { entity: "product-version:search:cards" },
            { entity: "offers:dashboard" }
        ]);

        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "OFFER",
            offerUUID,
            "Creación de oferta",
            { offer_description: offerData.description },
            userUUID
        ));
        return `Oferta creada exitosamente, ${offerData.description}`;
    };

    async update({ data, userUUID }: { data: UpdateOfferDTO, userUUID: string }) {
        const updated = await this.prisma.offers.update({
            where: { uuid: data.uuid },
            data: { ...data },
            select: { description: true }
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar la oferta");
            throw new BadRequestException("Error al actualizar la oferta");
        });
        await this.cache.invalidateMultipleEntities([
            { entity: "product-version:search:cards" },
            { entity: "offers:dashboard" }
        ]);
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "OFFER",
            data.uuid,
            "Actualización de oferta",
            { offer_description: updated.description },
            userUUID
        ));
        return `Oferta actualizada exitosamente, ${updated.description}`;
    };

    async delete({ uuid, userUUID }: { uuid: string, userUUID: string }) {
        const deleted = await this.prisma.offers.delete({ where: { uuid }, select: { description: true } }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al eliminar la oferta");
            throw new BadRequestException("Error al eliminar la oferta");
        });
        await this.cache.invalidateMultipleEntities([
            { entity: "product-version:search:cards" },
            { entity: "offers:dashboard" }
        ]);
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "OFFER",
            uuid,
            "Eliminación de oferta",
            { offer_description: deleted.description },
            userUUID
        ));
        return `Oferta eliminada exitosamente`;
    };

    async dashboard({ query: { limit, page, orderby, type } }: { query: OffersDashboardParams }): Promise<GetOffers> {
        const skip = (page - 1) * limit;
        const orderBy = orderby || "asc";
        let where = {};
        if (type) where = { target_type: type };
        return await this.cache.remember<GetOffers>({
            method: "staleWhileRevalidateWithLock",
            entity: "offers:dashboard",
            query: type ? { limit, page, orderBy, type } : { limit, page, orderBy },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const data = await this.prisma.offerTarget.findMany({
                    skip,
                    take: limit,
                    where,
                    select: {
                        target_type: true,
                        offer: { omit: { id: true, user_id: true } }
                    },
                    orderBy: { offer: { created_at: orderBy } }
                });
                const totalRecords = await this.prisma.offerTarget.count({ where });
                const totalPages: number = Math.ceil(totalRecords / limit);
                const response: GetOffers = {
                    data: data.map((off) => ({
                        ...off.offer,
                        target_type: off.target_type
                    })),
                    totalPages,
                    totalRecords
                };
                return response;
            }
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al obtener el dashboard de ofertas");
            throw new BadRequestException("Error al obtener el dashboard de ofertas");
        });
    };
};