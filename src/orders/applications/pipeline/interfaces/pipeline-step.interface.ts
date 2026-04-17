import { OrderContext } from "../order.context";
import { OrderContext as OrderContextV2 } from "../order.context-v2";

export interface OrderPipelineStep {
    execute(context: OrderContext): Promise<void>;
}

export interface OrderPipelineStepI {
    execute(context: OrderContextV2): Promise<void>;
}