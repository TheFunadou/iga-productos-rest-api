import { BadRequestException, Logger } from "@nestjs/common";
import { ShippingService } from "src/shipping/shipping.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";
import { PrismaService } from "src/prisma/prisma.service";

export class CreateShippingStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(CreateShippingStep.name);

    constructor(
        private readonly shipping: ShippingService,
        private readonly prisma: PrismaService
    ) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        const { orderId, orderStatus, skipped, orderResume } = context;
        // Solo actúa si la orden fue APPROVED o PENDING
        if (!orderStatus) throw new BadRequestException("No se encontro el status de la orden");
        if (!orderResume) throw new BadRequestException("No se encontro el resumen de la orden");
        if (!["APPROVED", "PENDING"].includes(orderStatus) || skipped) return;

        await this.prisma.$transaction(async (tx) => {
            if (!orderId) throw new Error("CreateShippingStep: orderId no disponible en contexto");
            await this.shipping.createShippingByApprovedOrder({
                tx,
                orderId,
                dto: {
                    concept: "Envio de articulos",
                    boxesCount: orderResume.boxesCount,
                    shippingStatus: context.orderStatus === "APPROVED" ? "IN_PREPARATION" : "STAND_BY",
                    shippingAmount: orderResume.shippingCost,
                }
            });
        });

        this.logger.log(`Shipping creado para orden ${context.orderUUID} con status ${context.orderStatus}`);
    }
}
