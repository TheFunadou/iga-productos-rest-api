import { Injectable, Logger } from "@nestjs/common";
import { BuildDetailsContext } from "../../get-details.context";
import { BuildDetailsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { AggregateCardEntitiesService } from "src/product-version/domain/services/search-cards/aggregate-entities.service";
import { AggregateOfferEntitiesService } from "src/offers/domain/services/aggregate-offer-entities.service";
import { FavoritesService } from "src/customer/favorites/favorites.service";
import { OfferLookupInputI, ProductListI } from "../../interfaces/get-cards.interface";

@Injectable()
export class HydrateDetailsStep implements BuildDetailsPipelineStep {
    private readonly logger = new Logger(HydrateDetailsStep.name);

    constructor(
        private readonly aggCard: AggregateCardEntitiesService,
        private readonly aggOffer: AggregateOfferEntitiesService,
        private readonly favorites: FavoritesService
    ) { }

    async execute(context: BuildDetailsContext): Promise<void> {
        if (context.stopPipeline || !context.productVersionEntity || !context.productEntity) {
            return;
        }

        try {
            const mainSku = context.productVersionEntity.sku;
            const parentSkus = context.productVersionEntity.parents.map(p => p.sku);
            const allSkus = Array.from(new Set([mainSku, ...parentSkus]));

            // Phase 1: Fetch stock, prices, and favorites in parallel
            const [stocks, prices, customerFavorites] = await Promise.all([
                this.aggCard.aggregateProductVersionStock({ skuList: allSkus }),
                this.aggCard.aggregateProductVersionPrices({ skuList: allSkus }),
                context.customerUUID ? this.favorites.favoritesList({ customerUUID: context.customerUUID }) : Promise.resolve([]),
            ]);

            // Build lookup maps
            context.stockEntities = new Map(stocks.map(s => [s.sku, s.stock]));
            context.priceEntities = new Map(prices.map(p => [p.sku, p.unitPrice]));
            context.customerFavorites = customerFavorites;

            // Phase 2: Build offer lookup inputs for main version and all parents
            const offerInputs: OfferLookupInputI[] = [];

            // Add main product version
            offerInputs.push({
                sku: mainSku,
                versionId: context.productVersionEntity.id,
                productId: context.productEntity.id,
                categoryId: context.productEntity.category.id,
                subcategoryIds: context.productEntity.subcategories.map(s => s.uuid)
            });

            // Add parent versions (excluding the main SKU to avoid duplicates)
            for (const parent of context.productVersionEntity.parents) {
                if (parent.sku !== mainSku) {
                    offerInputs.push({
                        sku: parent.sku,
                        versionId: parent.id,
                        productId: context.productEntity.id,
                        categoryId: context.productEntity.category.id,
                        subcategoryIds: context.productEntity.subcategories.map(s => s.uuid)
                    });
                }
            }

            // Fetch offers for all versions
            context.offerMap = await this.aggOffer.aggregateProductVersionOffers(offerInputs);
        } catch (error) {
            this.logger.error(`Failed to hydrate details for SKU ${context.sku}: ${error.message}`, error.stack);
            context.stopPipeline = true;
            throw error;
        }
    }
}
