import { Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";

export class RestoreStockStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(RestoreStockStep.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        // Solo actúa si la orden fue CANCELADA
        if (context.orderStatus === "CANCELLED" || context.orderStatus === "ABANDONED" || context.skipped) return;
        if (!context.orderUUID) throw new Error("RestoreStockStep: orderUUID no disponible en contexto");

        await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { uuid: context.orderUUID! },
                include: { order_items: true }
            });
            if (!order) throw new Error(`No se encontró la orden con UUID: ${context.orderUUID}`);

            for (const item of order.order_items) {
                await tx.productVersion.update({
                    where: { id: item.product_version_id },
                    data: { stock: { increment: item.quantity } }
                });
                this.logger.log(`Stock restaurado para producto ${item.product_version_id}: +${item.quantity}`);
            }
        });
    }
}
