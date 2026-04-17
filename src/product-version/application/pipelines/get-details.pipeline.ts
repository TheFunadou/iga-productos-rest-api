import { Inject, Injectable } from "@nestjs/common";
import { GET_DETAILS_PIPELINE_STEPS } from "./tokens";
import { BuildDetailsPipelineStep } from "./interfaces/pipeline-step.interface";
import { BuildDetailsContext } from "./get-details.context";

@Injectable()
export class BuildDetailsPipeline {
    constructor(
        @Inject(GET_DETAILS_PIPELINE_STEPS)
        private readonly steps: BuildDetailsPipelineStep[],
    ) { }

    async execute(context: BuildDetailsContext) {
        for (const step of this.steps) {
            await step.execute(context);
            if (context.stopPipeline) break;
        }
    }
}