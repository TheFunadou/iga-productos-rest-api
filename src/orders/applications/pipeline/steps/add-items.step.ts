import { ProductVersionCard } from "src/product-version/product-version.dto";
import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { AddItemsToOrderOrderItems } from "src/orders/order.dto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class AddItemsStep implements OrderPipelineStep {
    constructor() { };


    private async buildAddItemsToOrder(args: {
        pvCards: ProductVersionCard[],
        shoppingCart: ShoppingCartDTO[],
        orderId: string,
        tx: Prisma.TransactionClient
    }): Promise<AddItemsToOrderOrderItems[]> {
        const { pvCards, shoppingCart, orderId, tx } = args;
        const orderItems: AddItemsToOrderOrderItems[] = [];
        for (const item of pvCards) {
            const shoppingCartItem = shoppingCart.find((cart) => cart.product_version.sku === item.product_version.sku);
            if (shoppingCartItem) {
                const findItem = await tx.productVersion.findUnique({ where: { sku: shoppingCartItem.product_version.sku }, select: { id: true } });
                if (!findItem) throw new NotFoundException("Ocurrio un error al procesar la orden de pago");
                orderItems.push({
                    order_id: orderId,
                    product_version_id: findItem.id,
                    quantity: shoppingCartItem.quantity,
                    unit_price: parseFloat(item.product_version.unit_price.toString()),
                    final_price: parseFloat(item.product_version.unit_price_with_discount!.toString()),
                    isOffer: item.isOffer!,
                    discount: shoppingCartItem.discount,
                    subtotal: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) * shoppingCartItem.quantity : parseFloat(item.product_version.unit_price!.toString()) * shoppingCartItem.quantity,
                });
            }
        }
        return orderItems;
    };

    async execute(context: OrderContext): Promise<void> {
        const { pvCards, shoppingCart, orderId, tx } = context;
        if (!pvCards) throw new BadRequestException("No se encontraron las tarjetas de producto");
        if (!shoppingCart) throw new BadRequestException("No se encontro el carrito de compras");
        if (!orderId) throw new BadRequestException("No se encontro la referencia interna de la orden");
        const orderItems = await this.buildAddItemsToOrder({ pvCards, shoppingCart, orderId, tx });
        for (const data of orderItems) {
            await tx.orderItemsDetails.create({ data })
        };
    };
};