import { Injectable, Logger } from "@nestjs/common";
import { BuildDetailsContext } from "../../get-details.context";
import { BuildDetailsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { ProductVersionDetailsBuilder } from "src/product-version/application/builders/product-version-details.builder";

@Injectable()
export class BuildDetailsStep implements BuildDetailsPipelineStep {
    private readonly logger = new Logger(BuildDetailsStep.name);

    async execute(context: BuildDetailsContext): Promise<void> {
        if (context.stopPipeline || !context.productVersionEntity || !context.productEntity) {
            return;
        }

        try {
            context.finalDetails = ProductVersionDetailsBuilder.build(context);
        } catch (error) {
            this.logger.error(`Failed to build product version details for SKU ${context.sku}: ${error.message}`, error.stack);
            context.stopPipeline = true;
            throw error;
        }
    }
}