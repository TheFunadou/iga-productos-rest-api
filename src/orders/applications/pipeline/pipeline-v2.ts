import { Inject, Injectable, Logger } from "@nestjs/common";
import { ORDER_PIPELINE_STEPS, ORDER_SAGA_MAP } from "src/orders/tokens";
import { OrderContext } from "./order.context-v2";
import { SagaStep } from "./interfaces/saga-step-v2.interface";
import { OrderPipelineStepI } from "./interfaces/pipeline-step.interface";

@Injectable()
export class OrderPipeline {
    private completedSagaSteps: SagaStep[] = [];
    private readonly logger = new Logger(OrderPipeline.name);
    constructor(
        @Inject(ORDER_PIPELINE_STEPS)
        private readonly steps: OrderPipelineStepI[],

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
                this.logger.error(`Error en Pipeline [${error.status}]: ${error.message}`, error.stack);
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