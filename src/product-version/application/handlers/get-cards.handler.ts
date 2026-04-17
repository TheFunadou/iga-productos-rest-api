import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { GetCardsCommand } from "../commands/get-cards.command";
import { DebugBuildCardsPipeline } from "../pipelines/get-cards-debug-pipeline";
import { BuildCardsPipeline } from "../pipelines/get-cards.pipeline";
import { BuildCardsContext } from "../pipelines/get-cards.context";
import { GetProductVersionCardsV2 } from "src/product-version/product-version.dto";
import { Inject } from "@nestjs/common";

@CommandHandler(GetCardsCommand)
export class GetCardsHandler implements ICommandHandler<GetCardsCommand> {

    constructor(
        @Inject("BUILD_CARDS_PIPELINE_RESOLVED")
        private readonly pipeline: BuildCardsPipeline | DebugBuildCardsPipeline,
    ) { }

    async execute(command: GetCardsCommand): Promise<GetProductVersionCardsV2> {

        const context: BuildCardsContext = {
            scope: command.scope,
            queryParams: command.filters,
            customerUUID: command.customerUUID,
            isClient: command.scope === "external",
            productsList: command.productsList ?? [],
            productEntity: [],
            productVersionEntity: [],
            productVersionStockEntity: [],
            productVersionUnitPriceEntity: [],
            offerEntity: [],
            productVersionOfferMap: new Map(),
            customerFavorites: [],

            cards: [],
            stopPipeline: false,
        };

        await this.pipeline.execute(context);

        return {
            data: context.cards,
            totalRecords: context.totalRecords ?? 0,
            totalPages: context.totalPages ?? 0,
        };
    }
}
