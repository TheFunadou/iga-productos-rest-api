import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AggregateDetailsEntitiesService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { }

    /**
     * Looks up and caches the productUUID for a given SKU.
     * Uses cache.remember with StaleWhileRevalidateWithLock strategy.
     */
    async getProductUUID(sku: string): Promise<string> {
        const productUUID = await this.cache.remember<string>({
            method: "staleWhileRevalidateWithLock",
            entity: "product:uuid:lookup",
            query: { sku },
            aditionalOptions: {
                staleTimeMilliseconds: 15 * 60 * 1000, // 15 min
                ttlMilliseconds: 20 * 60 * 1000, // 20 min
            },
            fallback: async () => {
                const version = await this.prisma.productVersion.findUnique({
                    where: { sku },
                    select: { product: { select: { uuid: true } } }
                });


                if (!version?.product?.uuid) {
                    throw new Error(`Product UUID not found for SKU: ${sku}`);
                }

                return version.product.uuid;
            }
        });

        return productUUID;
    };


    async resolveIsReviewed({ customerUUID, sku }: { customerUUID?: string, sku: string }): Promise<boolean> {
        if (!customerUUID) return false;
        const customerReviews = await this.cache.remember<{ sku: string[] }>({
            method: "staleWhileRevalidate",
            entity: "customer:reviews:list",
            query: { customerUUID },
            fallback: async () => {
                const reviews = await this.prisma.customer.findUnique({
                    where: { uuid: customerUUID },
                    select: {
                        reviews: { select: { product_version: { select: { sku: true } } } }
                    }
                });

                if (!reviews || reviews.reviews.length === 0) return { sku: [] };

                return { sku: reviews.reviews.map(r => r.product_version.sku) };
            }
        });

        return customerReviews.sku.includes(sku);
    }
};
