import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class ValidateStockStep implements OrderPipelineStep {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { tx, shoppingCart } = context;
        if (!shoppingCart) throw new BadRequestException("Error al crear orden, no se encontro el carrito de compras");

        for (const item of shoppingCart) {
            const productVersion = await tx.productVersion.findUnique({
                where: { sku: item.product_version.sku },
                select: { stock: true }
            });
            if (!productVersion) throw new NotFoundException("Producto no encontrado");
            if (productVersion.stock < item.quantity) throw new BadRequestException("Stock insuficiente para realizar este compra");
        }
    };
};