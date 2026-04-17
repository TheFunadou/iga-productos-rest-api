import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
    OfferI,
    OfferLookupInputI,
    ProductVersionOfferI,
    ResolvedOfferI
} from "src/product-version/application/pipelines/interfaces/get-cards.interface";
import { OfferStackResolverService } from "./offer-stack-resolver.service";

@Injectable()
export class AggregateOfferEntitiesService {
    private readonly logger = new Logger(AggregateOfferEntitiesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly stackResolver: OfferStackResolverService,
    ) { }

    /**
     * Agrega y resuelve ofertas aplicables por SKU desde cache/DB.
     * Requiere datos enriquecidos del context (productId, categoryId, etc.)
     * para construir el WHERE correcto en el fallback.
     *
     * Key patterns:
     *   - product:version:<sku>:offers  → { sku, applicableOffers: uuid[] }
     *   - offer:<uuid>                  → OfferI completo
     */
    async aggregateProductVersionOffers(
        inputs: OfferLookupInputI[]
    ): Promise<Map<string, ResolvedOfferI>> {

        if (!inputs.length) return new Map();

        const now = new Date();

        // Índice de lookup por SKU para el fallback
        const inputBySku = new Map<string, OfferLookupInputI>(
            inputs.map(i => [i.sku, i])
        );

        // ─── STEP 1: Obtener UUIDs de ofertas aplicables por SKU ─────────────────
        const skuWhere = inputs.map(i => ({
            entity: "product:version:offers",
            query: { sku: i.sku },
        }));

        const { data: skuOfferMaps, misses: skuMisses } =
            await this.cache.getMultipleDataWithFallback<ProductVersionOfferI>({
                where: skuWhere,
                fallback: async (misses) => {
                    const missSkus = misses.map(m => m.originalArg.query.sku);

                    // Construir arrays únicos de IDs para el WHERE
                    const missInputs = missSkus
                        .map(sku => inputBySku.get(sku))
                        .filter((i): i is OfferLookupInputI => !!i);

                    const versionIds = missInputs.map(i => i.versionId);
                    const productIds = [...new Set(missInputs.map(i => i.productId))];
                    const categoryIds = [...new Set(missInputs.map(i => i.categoryId))];
                    const allSubcategoryIds = [...new Set(missInputs.flatMap(i => i.subcategoryIds))];

                    // Query única para todos los misses — mismo patrón que OffersUtilsService
                    const rows = await this.prisma.offerTarget.findMany({
                        where: {
                            OR: [
                                { target_type: 'PRODUCT_VERSION', target_id: { in: versionIds } },
                                { target_type: 'PRODUCT', target_id: { in: productIds } },
                                { target_type: 'CATEGORY', target_id: { in: categoryIds } },
                                { target_type: 'SUBCATEGORY', target_uuid_path: { hasSome: allSubcategoryIds } },
                            ],
                            offer: {
                                status: 'ACTIVE',
                                start_date: { lte: now },
                                end_date: { gte: now },
                                OR: [
                                    { max_uses: null },
                                    {
                                        max_uses: { not: null },
                                        current_uses: { lt: this.prisma.offers.fields.max_uses }
                                    }
                                ]
                            }
                        },
                        select: {
                            target_type: true,
                            target_id: true,
                            target_uuid_path: true,
                            offer: { select: { uuid: true } }
                        }
                    });

                    // Mapear: por cada SKU miss → filtrar qué rows le corresponden
                    return misses.map(miss => {
                        const input = inputBySku.get(miss.originalArg.query.sku)!;

                        const matchingUUIDs = rows
                            .filter(row => {
                                if (row.target_type === 'PRODUCT_VERSION') return row.target_id === input.versionId;
                                if (row.target_type === 'PRODUCT') return row.target_id === input.productId;
                                if (row.target_type === 'CATEGORY') return row.target_id === input.categoryId;
                                if (row.target_type === 'SUBCATEGORY')
                                    return input.subcategoryIds.some(id => row.target_uuid_path.includes(id));
                                return false;
                            })
                            .map(row => row.offer.uuid);

                        return {
                            logicalKey: miss.logicalKey,
                            data: {
                                sku: input.sku,
                                applicableOffers: matchingUUIDs,
                            } satisfies ProductVersionOfferI,
                        };
                    });
                },
                options: { ttl: 5 * 60 * 1000, staleTime: 3 * 60 * 1000 }
            });

        if (skuMisses.length > 0)
            this.logger.warn("[AggregateOfferEntitiesService] SKUs sin resolver:", skuMisses);

        // ─── STEP 2: Collectar todos los offer UUIDs únicos necesarios ───────────
        const allOfferUUIDs = [...new Set(skuOfferMaps.flatMap(m => m.applicableOffers))];

        // Early exit si ningún SKU tiene ofertas
        if (!allOfferUUIDs.length) {
            const emptyMap = new Map<string, ResolvedOfferI>();
            for (const input of inputs) {
                emptyMap.set(input.sku, {
                    sku: input.sku,
                    applicableOffers: [],
                    finalDiscount: 0,
                    isExclusive: false,
                    stackGroup: "BASE",
                });
            }
            return emptyMap;
        }

        // ─── STEP 3: Obtener datos ricos de cada oferta ───────────────────────────
        const offerWhere = allOfferUUIDs.map(uuid => ({
            entity: "offer",
            query: { uuid },
        }));

        const { data: offers, misses: offerMisses } =
            await this.cache.getMultipleDataWithFallback<OfferI>({
                where: offerWhere,
                fallback: async (misses) => {
                    const uuids = misses.map(m => m.originalArg.query.uuid);
                    const rows = await this.prisma.offers.findMany({
                        where: { uuid: { in: uuids } },
                        select: {
                            id: true,
                            uuid: true,
                            discount_percentage: true,
                            code: true,
                            type: true,
                            start_date: true,
                            end_date: true,
                            min_purchase_amount: true,
                            max_purchase_amount: true,
                            priority: true,
                            is_exclusive: true,
                            stack_group: true,
                            max_stack: true,
                            created_at: true,
                        }
                    });

                    return rows.map(r => ({
                        logicalKey: misses.find(m => m.originalArg.query.uuid === r.uuid)!.logicalKey,
                        data: {
                            id: r.id,
                            uuid: r.uuid,
                            discount: r.discount_percentage,
                            code: r.code ?? undefined,
                            type: r.type,
                            startDate: r.start_date,
                            endDate: r.end_date,
                            minPurchaseAmount: r.min_purchase_amount?.toString() ?? "0",
                            maxPurchaseAmount: r.max_purchase_amount?.toString() ?? "0",
                            priority: r.priority,
                            isExclusive: r.is_exclusive,
                            stackGroup: r.stack_group,
                            maxStack: r.max_stack ?? 2,
                            createdAt: r.created_at,
                        } satisfies OfferI,
                    }));
                },
                options: { ttl: 20 * 60 * 1000, staleTime: 15 * 60 * 1000 }
            });

        if (offerMisses.length > 0)
            this.logger.warn("[AggregateOfferEntitiesService] Offer UUIDs sin resolver:", offerMisses);

        // ─── STEP 4: Resolver stacking por SKU ───────────────────────────────────
        const offerIndex = new Map<string, OfferI>(offers.map(o => [o.uuid, o]));
        const resultMap = new Map<string, ResolvedOfferI>();

        for (const skuOfferMap of skuOfferMaps) {
            const rawOffers = skuOfferMap.applicableOffers
                .map(uuid => offerIndex.get(uuid))
                .filter((o): o is OfferI => !!o);

            const resolved = this.stackResolver.resolve(skuOfferMap.sku, rawOffers);
            resultMap.set(skuOfferMap.sku, resolved);
        }

        return resultMap;
    }
}
