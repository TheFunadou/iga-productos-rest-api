import { Injectable, Logger } from "@nestjs/common";
import { BuildDetailsContext } from "../../get-details.context";
import { BuildDetailsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { AggregateDetailsEntitiesService } from "src/product-version/domain/services/search-details/aggregate-entities.service";
import { AggregateCardEntitiesService } from "src/product-version/domain/services/search-cards/aggregate-entities.service";

@Injectable()
export class FetchCachedDataStep implements BuildDetailsPipelineStep {
    private readonly logger = new Logger(FetchCachedDataStep.name);

    constructor(
        private readonly aggregateDetails: AggregateDetailsEntitiesService,
        private readonly aggregateCards: AggregateCardEntitiesService
    ) { }

    async execute(context: BuildDetailsContext): Promise<void> {
        try {
            // Step 1: Get productUUID from cache (or DB on miss) using SKU lookup
            const productUUID = await this.aggregateDetails.getProductUUID(context.sku);

            // Step 2: Fetch both product and product version from cache (or DB on miss) in parallel
            const [productVersion, product, isReviewed] = await Promise.all([
                this.aggregateCards.aggregateProductVersions({ skuList: [context.sku] }),
                this.aggregateCards.aggregateProducts({ productUUIDs: [productUUID] }),
                this.aggregateDetails.resolveIsReviewed({ customerUUID: context.customerUUID, sku: context.sku })
            ]);

            context.productVersionEntity = productVersion[0];
            context.productEntity = product[0];
            context.isReviewed = isReviewed;

        } catch (error) {
            this.logger.error(`Failed to fetch cached data for SKU ${context.sku}: ${error.message}`, error.stack);
            context.stopPipeline = true;
            throw error;
        }
    }
}
