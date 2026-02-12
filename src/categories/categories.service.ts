import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDTO, SummaryCategories, GetCategories, PatchCategoryDTO } from './categories.dto';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
    ) { };

    async create(args: { data: CreateCategoryDTO }): Promise<GetCategories> {
        const category = await this.prisma.category.create({ data: args.data, omit: { id: true } });
        await this.cacheService.invalidateQuery({ entity: "categories", query: { all: true } });
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

    async patch(args: { data: PatchCategoryDTO }): Promise<GetCategories> {
        return await this.prisma.category.update({
            where: { uuid: args.data.uuid },
            data: args.data
        });
    };

    async delete(args: { uuid: string }): Promise<string> {
        const deleted = await this.prisma.category.delete({ where: { uuid: args.uuid } });
        await this.cacheService.invalidateQuery({ entity: "categories", query: { all: true } });
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
                    const product_versions = await this.prisma.productVersion.findMany({
                        where: {
                            product: {
                                category_id: category.id
                            }
                        },
                        take: 4,
                        orderBy: { created_at: 'asc' },
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
