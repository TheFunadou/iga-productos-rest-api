import { calcShoppingCartOrderResume } from "src/orders/orders.helpers";
import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class CalcOrderResumeStep implements OrderPipelineStep {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { shoppingCart } = context;
        if (!shoppingCart) throw new BadRequestException("No se encontro el carrito de compras");
        const orderResume = calcShoppingCartOrderResume({ shoppingCart });
        context.orderResume = orderResume;
    };
};