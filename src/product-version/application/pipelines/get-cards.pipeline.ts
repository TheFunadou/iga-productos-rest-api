import { Inject, Injectable } from "@nestjs/common";
import { BUILD_CARDS_PIPELINE_STEPS } from "./tokens";
import { BuildCardsPipelineStep } from "./interfaces/pipeline-step.interface";
import { BuildCardsContext } from "./get-cards.context";

@Injectable()
export class BuildCardsPipeline {

    constructor(
        @Inject(BUILD_CARDS_PIPELINE_STEPS)
        private readonly steps: BuildCardsPipelineStep[],
    ) { }

    async execute(context: BuildCardsContext) {
        for (const step of this.steps) {
            await step.execute(context);

            if (context.stopPipeline) break;
        }
    }
}
