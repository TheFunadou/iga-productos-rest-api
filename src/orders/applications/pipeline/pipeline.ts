import { Inject, Injectable } from "@nestjs/common";
import { SagaStep } from "./interfaces/saga-step.interface";
import { ORDER_PIPELINE_STEPS, ORDER_SAGA_MAP } from "src/orders/tokens";
import { OrderPipelineStep } from "./interfaces/pipeline-step.interface";
import { OrderContext } from "./order.context";

@Injectable()
export class OrderPipeline {
    private completedSagaSteps: SagaStep[] = [];

    constructor(
        @Inject(ORDER_PIPELINE_STEPS)
        private readonly steps: OrderPipelineStep[],

        @Inject(ORDER_SAGA_MAP)
        private readonly sagaMap: Map<Function, SagaStep>
    ) { }

    async execute(context: OrderContext) {
        for (const step of this.steps) {
            try {
                await step.execute(context);

                const saga = this.sagaMap.get(step.constructor);
                if (saga) this.completedSagaSteps.push(saga);

            } catch (error) {
                await this.rollback(context);
                throw error;
            }
        }
    }

    private async rollback(context: OrderContext) {
        for (const step of this.completedSagaSteps.reverse()) {
            await step.compensate(context);
        }
    }
}