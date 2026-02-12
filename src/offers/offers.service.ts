import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOfferDTO, GetOffers, UpdateOfferDTO } from './offers.dto';

@Injectable()
export class OffersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { };

    async create(args: { data: CreateOfferDTO, userUUID: string }) {
        const { target, ...offerData } = args.data;
        const user = await this.prisma.user.findUnique({ where: { uuid: args.userUUID }, select: { id: true } })
        if (!user) throw new NotFoundException("No se encontro el usuario");
        await this.prisma.offers.create({
            data: {
                ...offerData,
                user_id: user.id,
                offer_targets: {
                    create: {
                        ...target,
                        target_uuid_path: target.target_uuid_path && target.target_uuid_path.length > 0 ? target.target_uuid_path : []
                    }
                }
            }
        });
        await this.cache.invalidateEntity({ entity: "product-version:search:cards" })
        return `Oferta creada exitosamente, ${offerData.description}`;
    };

    async update(args: { data: UpdateOfferDTO }) {
        const updated = await this.prisma.offers.update({
            where: { uuid: args.data.uuid },
            data: { ...args.data },
            select: { description: true }
        });
        return `Oferta actualizada exitosamente, ${updated.description}`;
    };

    async delete(args: { uuid: string }) {
        await this.prisma.offers.delete({ where: { uuid: args.uuid } });
        return `Oferta eliminada exitosamente`;
    };

    async dashboard(args: { pagination: { page: number, limit: number } }): Promise<GetOffers> {
        const { page, limit } = args.pagination;
        const skip = (page - 1) * limit;
        return await this.cache.remember<GetOffers>({
            method: "staleWhileRevalidateWithLock",
            entity: "offers:dashboard",
            query: args.pagination,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                return await this.prisma.$transaction(async (tx) => {
                    const data = await tx.offerTarget.findMany({
                        skip,
                        take: limit,
                        select: {
                            target_type: true,
                            offer: {
                                select: {
                                    uuid: true,
                                    description: true,
                                    discount_percentage: true,
                                    type: true,
                                    status: true,
                                    start_date: true,
                                    end_date: true,
                                    max_uses: true,
                                    current_uses: true,
                                    created_at: true,
                                    updated_at: true,
                                }
                            }
                        }
                    });
                    const totalRecords = await tx.offerTarget.count();
                    return { data, totalRecords, totalPages: Math.ceil(totalRecords / limit) };
                });
            }
        })



    }
};