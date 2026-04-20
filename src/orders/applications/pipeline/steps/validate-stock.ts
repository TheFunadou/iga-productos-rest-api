import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class ValidateStockStep implements OrderPipelineStepI {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { tx, orderShoppingCart } = context;
        if (!orderShoppingCart) throw new BadRequestException("Error al crear orden, no se encontro el carrito de compras");

        for (const item of orderShoppingCart) {
            const productVersion = await tx.productVersion.findUnique({
                where: { sku: item.sku },
                select: { stock: true }
            });
            if (!productVersion) throw new NotFoundException("Producto no encontrado");
            if (productVersion.stock < item.quantity) throw new BadRequestException("Stock insuficiente para realizar este compra");
        }
    };
};