import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ShoppingCartServiceV2 } from "src/customer/shopping-cart/domain/services/shopping-cart.service";
import { OrderContext } from "../order.context-v2";

@Injectable()
export class GetShoppingCartStep implements OrderPipelineStepI {
    constructor(
        private readonly shoppingCartService: ShoppingCartServiceV2,
    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { customerUUID, sessionId } = context;
        if (!sessionId) throw new NotFoundException("No se encontro la sesion del usuario");
        const client = this.shoppingCartService.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.shoppingCartService.getShoppingCart(client);
        if (!shoppingCart || shoppingCart.length === 0) throw new NotFoundException("No se encontro el carrito de compras");
        context.shoppingCart = shoppingCart;
    };
};