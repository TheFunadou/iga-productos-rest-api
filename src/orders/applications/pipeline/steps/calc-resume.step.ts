import { calcResume } from "src/orders/helpers/order.helpers";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ShoppingCartItemsResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";

@Injectable()
export class CalcOrderResumeStep implements OrderPipelineStepI {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { orderShoppingCart } = context;
        if (!orderShoppingCart) throw new BadRequestException("No se encontro el carrito de compras");
        const items: ShoppingCartItemsResumeI[] = orderShoppingCart.map(item => ({
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            finalPrice: item.finalPrice,
            isOffer: item.offer.isOffer
        }));
        const orderResume = calcResume({ items });
        context.orderResume = orderResume;
    };
};