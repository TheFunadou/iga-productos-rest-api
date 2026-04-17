import { OrderContext } from "../order.context-v2";
import { AddItemsToOrderOrderItems } from "src/orders/order.dto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderShoppingCartI } from "../interfaces/order.interface";

@Injectable()
export class AddItemsStep implements OrderPipelineStepI {
    constructor() { };

    private async buildAddItemsToOrder(args: {
        data: OrderShoppingCartI[],
        orderId: string,
    }): Promise<AddItemsToOrderOrderItems[]> {
        const { data, orderId } = args;
        const orderItems: AddItemsToOrderOrderItems[] = [];
        for (const item of data) {
            orderItems.push({
                order_id: orderId,
                product_version_id: item.versionId,
                quantity: item.quantity,
                unit_price: parseFloat(item.unitPrice),
                final_price: parseFloat(item.finalPrice),
                isOffer: item.offer.isOffer,
                discount: item.offer.discount,
                subtotal: item.offer.isOffer ? parseFloat(item.finalPrice) * item.quantity : parseFloat(item.unitPrice) * item.quantity,
            });
        }
        return orderItems;
    };

    async execute(context: OrderContext): Promise<void> {
        const { tx, orderId, orderShoppingCart } = context;
        if (!orderShoppingCart) throw new BadRequestException("No se encontraron las tarjetas de producto");
        if (!orderShoppingCart) throw new BadRequestException("No se encontro el carrito de compras");
        if (!orderId) throw new BadRequestException("No se encontro la referencia interna de la orden");
        const orderItems = await this.buildAddItemsToOrder({ data: orderShoppingCart, orderId });
        for (const data of orderItems) {
            await tx.orderItemsDetails.create({ data })
        };
    };
};