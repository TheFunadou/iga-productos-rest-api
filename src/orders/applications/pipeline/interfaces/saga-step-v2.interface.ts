import { OrderContext } from "../order.context-v2";

export interface SagaStep {
    compensate(context: OrderContext): Promise<void>;
}