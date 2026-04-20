import { OrderContext } from "../order.context";


export interface OrderPipelineStepI {
    execute(context: OrderContext): Promise<void>;
}