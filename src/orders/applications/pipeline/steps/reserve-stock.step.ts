import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class ReserveStockStep implements OrderPipelineStep {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { tx, shoppingCart } = context;
        if (!shoppingCart) throw new BadRequestException("Error al crear orden, no se encontro el carrito de compras");

        for (const item of shoppingCart) {
            await tx.productVersion.update({
                where: { sku: item.product_version.sku },
                data: { stock: { decrement: item.quantity } }
            })
        }
    };
};