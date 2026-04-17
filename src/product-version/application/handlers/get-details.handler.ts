import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { GetDetailsCommand } from "../commands/get-details.command";
import { BuildDetailsPipeline } from "../pipelines/get-details.pipeline";
import { BuildDetailsContext } from "../pipelines/get-details.context";
import { ProductVersionDetailsI } from "../pipelines/interfaces/get-details.interface";

@CommandHandler(GetDetailsCommand)
export class GetDetailsHandler implements ICommandHandler<GetDetailsCommand> {
    constructor(
        private readonly pipeline: BuildDetailsPipeline
    ) {}

    async execute(command: GetDetailsCommand): Promise<ProductVersionDetailsI> {
        const context: BuildDetailsContext = {
            sku: command.sku,
            customerUUID: command.customerUUID,
            stopPipeline: false
        };

        await this.pipeline.execute(context);

        if (!context.finalDetails) {
            throw new Error(`Failed to build product version details for SKU: ${command.sku}`);
        }

        return context.finalDetails;
    }
}