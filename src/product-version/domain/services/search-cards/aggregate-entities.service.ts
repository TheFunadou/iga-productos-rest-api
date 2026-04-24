import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductI, ProductVersionI, ProductVersionStockI, ProductVersionUnitPriceI } from "src/product-version/application/pipelines/interfaces/get-cards.interface";


@Injectable()
export class AggregateCardEntitiesService {
    private readonly logger = new Logger(AggregateCardEntitiesService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { };

    async aggregateProducts({ productUUIDs }: { productUUIDs: string[] }): Promise<ProductI[]> {
        const where: { entity: string, query: { uuid: string } }[] = productUUIDs.map(uuid => ({
            entity: "product",
            query: { uuid }
        }));
        const { data, misses } = await this.cache.getMultipleDataWithFallback<ProductI>({
            where,
            fallback: async (misses) => {
                const uuids: string[] = misses.map(m => m.originalArg.query.uuid);
                const rows = await this.prisma.product.findMany({
                    where: { uuid: { in: uuids } },
                    select: {
                        id: true,
                        uuid: true,
                        product_name: true,
                        category: { select: { id: true, uuid: true, name: true } },
                        subcategories: {
                            select: {
                                subcategories: { select: { uuid: true, description: true } }
                            }
                        },
                        created_at: true,
                        updated_at: true,
                        specs: true,
                        applications: true,
                        certifications_desc: true,
                        recommendations: true,
                        description: true
                    }
                });
                return rows.map(r => ({
                    logicalKey: misses.find(m => m.originalArg.query.uuid === r.uuid)!.logicalKey,
                    data: {
                        id: r.id,
                        uuid: r.uuid,
                        name: r.product_name,
                        category: { id: r.category.id, uuid: r.category.uuid, name: r.category.name },
                        subcategories: r.subcategories.map(s => ({
                            uuid: s.subcategories.uuid,
                            name: s.subcategories.description,
                        })),
                        createdAt: r.created_at,
                        updatedAt: r.updated_at,
                        details: {
                            specs: r.specs,
                            description: r.description,
                            applications: r.applications,
                            recommendations: r.recommendations,
                            certsDesc: r.certifications_desc
                        }
                    } satisfies ProductI,
                }));
            },
            options: {
                ttl: 20 * 60 * 1000,
                staleTime: 15 * 60 * 1000
            },
        });

        if (misses.length > 0) this.logger.log("[BuildCardsPipeline] keys no resueltas en DB: ", misses);

        return data;
    };

    async aggregateProductVersions({ skuList }: { skuList: string[] }): Promise<ProductVersionI[]> {
        const where: { entity: string, query: { sku: string } }[] = skuList.map(sku => ({
            entity: "product:version",
            query: { sku }
        }));

        const { data, misses } = await this.cache.getMultipleDataWithFallback<ProductVersionI>({
            where,
            fallback: async (misses) => {
                const skuList: string[] = misses.map(m => m.originalArg.query.sku);
                const rows = await this.prisma.productVersion.findMany({
                    where: { sku: { in: skuList } },
                    select: {
                        id: true,
                        sku: true,
                        code_bar: true,
                        color_code: true,
                        color_line: true,
                        color_name: true,
                        status: true,
                        technical_sheet_url: true,
                        product: {
                            select: {
                                product_versions: {
                                    select: {
                                        id: true,
                                        sku: true,
                                        color_code: true,
                                        product_version_images: { take: 1, select: { imageUrl: true } }
                                    },
                                    orderBy: { sku: "asc" }
                                },
                            }
                        },
                        product_version_images: {
                            select: { mainImage: true, imageUrl: true }
                        },
                        reviews: { select: { rating: true }, },
                        created_at: true,
                        updated_at: true
                    }
                });

                return rows.map(r => ({
                    logicalKey: misses.find(m => m.originalArg.query.sku === r.sku)!.logicalKey,
                    data: {
                        id: r.id,
                        sku: r.sku,
                        codeBar: r.sku,
                        color: { line: r.color_line, code: r.color_code, name: r.color_name },
                        status: r.status,
                        technicalSheetUrl: r.technical_sheet_url,
                        parents: r.product.product_versions.map(v => ({ id: v.id, sku: v.sku, colorCode: v.color_code, imageUrl: v.product_version_images[0].imageUrl })),
                        images: r.product_version_images.map(i => ({ url: i.imageUrl, mainImage: i.mainImage })),
                        rating: r.reviews.map(r => ({ rating: r.rating })).reduce((acc, r) => acc + r.rating, 0) / r.reviews.length,
                        createdAt: r.created_at,
                        updatedAt: r.updated_at
                    } satisfies ProductVersionI,
                }));
            },
            options: {
                ttl: 20 * 60 * 1000,
                staleTime: 15 * 60 * 1000
            },
        });

        if (misses.length > 0) this.logger.log("[BuildCardsPipeline] keys no resueltas en DB: ", misses);

        return data;
    };


    async aggregateProductVersionStock({ skuList }: { skuList: string[] }): Promise<ProductVersionStockI[]> {
        const where: { entity: string, query: { sku: string } }[] = skuList.map(sku => ({
            entity: "product:version:stock",
            query: { sku }
        }));

        const { data, misses } = await this.cache.getMultipleDataWithFallback<ProductVersionStockI>({
            where,
            fallback: async (misses) => {
                const skuList: string[] = misses.map(m => m.originalArg.query.sku);
                const rows = await this.prisma.productVersion.findMany({
                    where: { sku: { in: skuList } },
                    select: { sku: true, stock: true }
                });
                return rows.map(r => ({
                    logicalKey: misses.find(m => m.originalArg.query.sku === r.sku)!.logicalKey,
                    data: {
                        sku: r.sku,
                        stock: r.stock
                    } satisfies ProductVersionStockI,
                }));
            },
            options: {
                ttl: 5 * 60 * 1000,
                staleTime: 3 * 60 * 1000
            },
        });

        if (misses.length > 0) this.logger.log("[BuildCardsPipeline] keys no resueltas en DB: ", misses);

        return data;
    };

    async aggregateProductVersionPrices({ skuList }: { skuList: string[] }): Promise<ProductVersionUnitPriceI[]> {
        const where: { entity: string, query: { sku: string } }[] = skuList.map(sku => ({
            entity: "product:version:price",
            query: { sku }
        }));

        const { data, misses } = await this.cache.getMultipleDataWithFallback<ProductVersionUnitPriceI>({
            where,
            fallback: async (misses) => {
                const skuList: string[] = misses.map(m => m.originalArg.query.sku);
                const rows = await this.prisma.productVersion.findMany({
                    where: { sku: { in: skuList } },
                    select: { sku: true, unit_price: true }
                });
                return rows.map(r => ({
                    logicalKey: misses.find(m => m.originalArg.query.sku === r.sku)!.logicalKey,
                    data: {
                        sku: r.sku,
                        unitPrice: r.unit_price.toString()
                    } satisfies ProductVersionUnitPriceI,
                }));
            },
            options: {
                ttl: 5 * 60 * 1000,
                staleTime: 3 * 60 * 1000
            },
        });

        if (misses.length > 0) this.logger.log("[BuildCardsPipeline] keys no resueltas en DB: ", misses);

        return data;
    };





};