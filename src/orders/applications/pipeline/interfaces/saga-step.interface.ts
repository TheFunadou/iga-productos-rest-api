import { OrderContext } from "../order.context";

export interface SagaStep {
    compensate(context: OrderContext): Promise<void>;
}