import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderContext } from "../order.context";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";

@Injectable()
export class ReserveStockStep implements OrderPipelineStepI {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { tx, orderShoppingCart } = context;
        if (!orderShoppingCart) throw new BadRequestException("Error al crear orden, no se encontro el carrito de compras");

        for (const item of orderShoppingCart) {
            await tx.productVersion.update({
                where: { sku: item.sku },
                data: { stock: { decrement: item.quantity } }
            })
        }
    };
};