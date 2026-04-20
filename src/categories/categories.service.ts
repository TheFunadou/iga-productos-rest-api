import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDTO, SummaryCategories, GetCategories, PatchCategoryDTO } from './categories.dto';
import { UserLogEvent } from 'src/audit/user-log.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(CategoriesService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly eventEmmiter: EventEmitter2,
        private readonly config: ConfigService,
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async create({ data, userUUID }: { data: CreateCategoryDTO, userUUID: string }): Promise<GetCategories> {
        const category = await this.prisma.category.create({ data: data, omit: { id: true } }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar la oferta");
            throw new BadRequestException("Error al actualizar la oferta");
        });
        await this.cacheService.invalidateMultipleEntities([
            { entity: "categories" },
            { entity: "categories:summary" }
        ]);
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "CATEGORY",
            category.uuid,
            "Creación de categoría",
            { category_name: category.name },
            userUUID
        ));
        return category;
    };

    async findAll(): Promise<GetCategories[]> {
        return await this.cacheService.remember<GetCategories[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "categories",
            query: { all: true },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60,
                staleTimeMilliseconds: 1000 * 60 * 50
            },
            fallback: async () => {
                return await this.prisma.category.findMany({ omit: { id: true } });
            }
        });
    };

    async patch({ data, userUUID }: { data: PatchCategoryDTO, userUUID: string }): Promise<GetCategories> {
        const updated = await this.prisma.category.update({
            where: { uuid: data.uuid }, data
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar la categoría");
            throw new BadRequestException("Error al actualizar la categoría");
        });
        await this.cacheService.invalidateMultipleEntities([
            { entity: "categories" },
            { entity: "categories:summary" }
        ]);
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "CATEGORY",
            updated.uuid,
            "Actualización de categoría",
            { category_name: updated.name },
            userUUID
        ));
        return updated;
    };

    async delete({ uuid, userUUID }: { uuid: string, userUUID: string }): Promise<string> {
        const deleted = await this.prisma.category.delete({ where: { uuid } }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al eliminar la categoría");
            throw new BadRequestException("Error al eliminar la categoría");
        });
        await this.cacheService.invalidateMultipleEntities([
            { entity: "categories" },
            { entity: "categories:summary" }
        ]);
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "CATEGORY",
            deleted.uuid,
            "Eliminación de categoría",
            { category_name: deleted.name },
            userUUID
        ));
        return `Categoria eliminada sastisfactoriamente ${deleted.name}`
    };


    async summaryCategories(): Promise<SummaryCategories[]> {
        return await this.cacheService.remember<SummaryCategories[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "categories:summary",
            fallback: async () => {
                const categories = await this.prisma.category.findMany({
                    select: { id: true, name: true }
                });

                const result: SummaryCategories[] = [];

                for (const category of categories) {

                    let cascosSkuList: string[] = ["CAS1-AM1-005", "CAS2-AM1-001", "CAS3-AI2-006", "CAS-WINGS-001"];
                    let where: Prisma.ProductVersionWhereInput;
                    if (category.name === "Cascos") {
                        where = { sku: { in: cascosSkuList } }
                    } else {
                        where = { product: { category: { name: category.name } } }
                    }

                    const product_versions = await this.prisma.productVersion.findMany({
                        where,
                        take: 4,
                        orderBy: { color_name: 'asc' },
                        select: {
                            sku: true,
                            product_version_images: {
                                take: 1,
                                select: { image_url: true }
                            },
                            product: {
                                select: { product_name: true }
                            }
                        }
                    });

                    result.push({
                        categoryName: category.name,
                        productVersion: product_versions.map(pv => ({
                            sku: pv.sku,
                            productName: pv.product.product_name,
                            imageUrl: pv.product_version_images[0]?.image_url ?? null
                        }))
                    });
                }

                return result;
            }
        })
    };
};
