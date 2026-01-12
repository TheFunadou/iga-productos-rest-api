import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductVersionDTO, GetProductVersionReviews, GetPVReviewRating, PatchProductVersionDTO, SafeProductVersionImages, SearchProductVersionsDTO } from './product-version.dto';
import { Decimal } from '@prisma/client/runtime/index-browser';
import { CustomerReviewDTO } from 'src/customer/customer.dto';

@Injectable()
export class ProductVersionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };

    async create(args: { data: CreateProductVersionDTO }) {
        const { father_uuid, version_images, ...data } = args.data;

        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { uuid: father_uuid }, select: { id: true } });
            if (!product) throw new NotFoundException("No se encontro el producto padre relacionado a la version");
            const created = await tx.productVersion.create({
                data: {
                    ...data,
                    unit_price: new Decimal(data.unit_price),
                    product_id: product.id
                }
            });
            await this.createVersionImages({ tx, versionImages: version_images, productVersionId: created.id });
            // await this.cacheService.invalidateQuery({entity: "product-version:detail"})
            return `Version ${created.sku} creada satisfactoriamente`;
        });
    };

    private async createVersionImages(args: { tx?: any, versionImages: SafeProductVersionImages[], productVersionId: string }) {
        if (args.tx) {
            return await args.tx.productVersionImages.createMany({
                data: args.versionImages.map((img) => ({
                    product_version_id: args.productVersionId,
                    image_url: img.image_url,
                    main_image: img.main_image
                }))
            });
        };
        return await this.prisma.productVersionImages.createMany({
            data: args.versionImages.map((img) => ({
                product_version_id: args.productVersionId,
                image_url: img.image_url,
                main_image: img.main_image
            }))
        });
    };

    async patch(args: { data: PatchProductVersionDTO }) {
        const { father_uuid, version_images, ...data } = args.data;

        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { uuid: father_uuid }, select: { id: true } });
            if (!product) throw new NotFoundException("No se encontro el producto padre relacionado a la version");
            if (data.main_version) {
                await tx.productVersion.updateMany({
                    where: { product_id: product.id },
                    data: { main_version: false }
                });
            };
            const udpated = await tx.productVersion.update({
                where: { sku: data.sku },
                data: {
                    ...data,
                    unit_price: data.unit_price ? new Decimal(data.unit_price) : undefined,
                    product_id: product.id
                }
            });
            if (version_images) {
                await tx.productVersionImages.deleteMany({ where: { product_version_id: udpated.id } });
                await this.createVersionImages({ tx, versionImages: version_images, productVersionId: udpated.id });
            };
            return `Version ${udpated.sku} actualizada satisfactoriamente`;
        });
    };

    async delete(args: { sku: string }): Promise<string> {
        return await this.prisma.$transaction(async (tx) => {
            const deleted = await tx.productVersion.delete({ where: { sku: args.sku }, select: { id: true, sku: true, main_version: true, product: { select: { id: true } } } });
            if (deleted.main_version) {
                const list = await tx.productVersion.findMany({
                    where: { product_id: deleted.product.id },
                    select: { id: true }
                });

                const random = list[Math.floor(Math.random() * list.length)];
                await tx.productVersion.update({
                    where: { id: random.id },
                    data: { main_version: true }
                })
            };
            await this.cacheService.invalidateMultipleEntities([
                { entity: "product-version:search:cards" },
                { entity: "product-version:show-details" }
            ])
            await tx.productVersionImages.deleteMany({ where: { product_version_id: deleted.id } });
            return `Version ${deleted.sku} eliminada exitosamente`;
        });
    }

    async list(args: { input: string }): Promise<SearchProductVersionsDTO[]> {
        if (!args.input || args.input.length < 4) return [];
        return await this.cacheService.remember<SearchProductVersionsDTO[]>({
            method: "staleWhileRevalidate",
            entity: "product-version:list",
            query: { input: args.input },
            fallback: async () => {
                const results = await this.prisma.productVersion.findMany({
                    take: 10,
                    where: { product: { product_name: { contains: args.input, mode: "insensitive" } } },
                    select: {
                        sku: true,
                        color_name: true,
                        product: { select: { product_name: true, category: { select: { name: true } } } }
                    }
                });

                return results.map((rs) => ({
                    product_name: rs.product.product_name,
                    category: rs.product.category.name,
                    sku: rs.sku,
                    color: rs.color_name
                }));
            }
        });
    };

    async addReview(args: { customerUUID: string, data: CustomerReviewDTO }): Promise<string> {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
            const productVersion = await tx.productVersion.findFirst({ where: { sku: { equals: args.data.sku, mode: "insensitive" } }, select: { id: true } });
            if (!customer) throw new NotFoundException("No se encontro el cliente");
            if (!productVersion) throw new NotFoundException("No se encontro la version de producto");

            await tx.productVersionReviews.create({ data: { ...args.data, customer_id: customer.id, product_version_id: productVersion.id } });
            return `Comentario agregado exitosamente`;
        });
    };


    async findManyReviewsBySKU(args: { sku: string, pagination: { page: number, limit: number } }): Promise<GetProductVersionReviews[]> {
        return await this.cacheService.remember<GetProductVersionReviews[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:reviews",
            query: { sku: args.sku },
            fallback: async () => {
                return await this.prisma.$transaction(async (tx) => {
                    const reviews = await tx.productVersionReviews.findMany({
                        take: args.pagination.limit || 10,
                        skip: (args.pagination.page || 1) - 1,
                        where: { product_version: { sku: { equals: args.sku, mode: "insensitive" } } },
                        select: {
                            uuid: true,
                            title: true,
                            comment: true,
                            rating: true,
                            created_at: true,
                            customer: { select: { name: true } }
                        },
                    });

                    const totalRecords = await tx.productVersionReviews.count({
                        where: { product_version: { sku: { equals: args.sku, mode: "insensitive" } } }
                    });

                    return reviews.map((review) => ({
                        ...review,
                        totalRecords,
                        totalPages: Math.ceil(totalRecords / (args.pagination?.limit || 10)),
                        customer: review.customer.name
                    }));
                })
            }
        })
    };

    async getReviewRatingResumeBySKU(args: { sku: string }): Promise<GetPVReviewRating[]> {
        return await this.cacheService.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:reviews:rating-review-resume",
            query: { sku: args.sku },
            fallback: async () => {
                return await this.prisma.$transaction(async (tx) => {
                    const totalRecords = await tx.productVersionReviews.count({
                        where: { product_version: { sku: { equals: args.sku, mode: "insensitive" } } }
                    });

                    const ratingPerStar = await tx.productVersionReviews.groupBy({
                        by: ['rating'],
                        where: {
                            product_version: {
                                sku: { equals: args.sku, mode: 'insensitive' }
                            }
                        },
                        _count: {
                            rating: true
                        }
                    });

                    return Array.from({ length: 5 }, (_, i) => {
                        const star = i + 1
                        const found = ratingPerStar.find(r => r.rating === star)
                        const count = found?._count.rating ?? 0

                        return { rating: star, percentage: totalRecords === 0 ? 0 : Number(((count / totalRecords) * 100).toFixed(2)) }
                    });

                })
            }
        })
    }




};
