import { PrismaService } from "src/prisma/prisma.service";
import { BuildCardsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { BuildCardsContext } from "../../get-cards.context";
import { CacheService } from "src/cache/cache.service";
import { ProductListI } from "../../interfaces/get-cards.interface";
import { Injectable } from "@nestjs/common";

@Injectable()
export class FetchProductsStep implements BuildCardsPipelineStep {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { };

    async execute(context: BuildCardsContext): Promise<void> {
        const { cacheEntity, cacheQuery, where, pagination, orderBy, productsList } = context;

        if (!where && productsList.length) return;

        if (!productsList.length && !where) {
            context.stopPipeline = true;
            return;
        };

        if (!cacheEntity || !cacheQuery) {
            context.stopPipeline = true;
            return;
        }
        if (!pagination || !orderBy) {
            context.stopPipeline = true;
            return;
        }

        const result = await this.cache.remember<ProductListI[]>({
            method: "staleWhileRevalidateWithLock",
            entity: cacheEntity,
            query: cacheQuery,
            fallback: async () => {
                const data = await this.prisma.productVersion.findMany({
                    take: pagination.take,
                    skip: pagination.skip,
                    where,
                    orderBy,
                    select: {
                        sku: true,
                        product: { select: { uuid: true } },
                    }
                });

                const map = new Map<string, string[]>();
                for (const { sku, product: { uuid } } of data) {
                    if (!map.has(uuid)) {
                        map.set(uuid, []);
                    }
                    map.get(uuid)!.push(sku);
                }

                const itemList = Array.from(map, ([productUUID, sku]) => ({
                    productUUID,
                    sku
                }));

                return itemList;
            }
        });

        context.productsList = result;
    };
};