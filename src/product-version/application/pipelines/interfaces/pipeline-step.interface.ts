import { BuildCardsContext } from "../get-cards.context";
import { BuildDetailsContext } from "../get-details.context";

export interface BuildCardsPipelineStep {
    execute(context: BuildCardsContext): Promise<void>
};

export interface BuildDetailsPipelineStep {
    execute(context: BuildDetailsContext): Promise<void>
}