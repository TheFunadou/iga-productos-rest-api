import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderContext } from "../order.context";
import { ShoppingCartService } from "src/customer/shopping-cart/domain/services/shopping-cart.service";

@Injectable()
export class GetShoppingCartStep implements OrderPipelineStepI {
    constructor(
        private readonly shoppingCartService: ShoppingCartService,
    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { customerUUID, sessionId, buyNowItem } = context;
        if (buyNowItem) {
            context.shoppingCart = [{
                item: {
                    productUUID: buyNowItem.item.productUUID,
                    sku: buyNowItem.item.sku,
                },
                quantity: await this.shoppingCartService.resolveStock({ quantity: buyNowItem.quantity, sku: buyNowItem.item.sku }),
                isChecked: true
            }]; return;
        };
        if (!sessionId) throw new NotFoundException("No se encontro la sesion del usuario");
        const client = this.shoppingCartService.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.shoppingCartService.getShoppingCart(client);
        if (!shoppingCart || shoppingCart.length === 0) throw new NotFoundException("No se encontro el carrito de compras");
        context.shoppingCart = shoppingCart;
    };
};