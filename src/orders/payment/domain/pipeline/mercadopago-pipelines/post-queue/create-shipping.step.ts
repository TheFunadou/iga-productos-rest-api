import { Logger } from "@nestjs/common";
import { ShippingService } from "src/shipping/shipping.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";

export class CreateShippingStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(CreateShippingStep.name);

    constructor(private readonly shipping: ShippingService) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        // Solo actúa si la orden fue APPROVED o PENDING
        if (!["APPROVED", "PENDING"].includes(context.orderStatus!) || context.skipped) return;
        if (!context.orderId) throw new Error("CreateShippingStep: orderId no disponible en contexto");

        await this.shipping.createShippingByApprovedOrder({
            orderId: context.orderId,
            dto: {
                concept: "Envio de productos",
                shipping_status: context.orderStatus === "APPROVED" ? "IN_PREPARATION" : "STAND_BY",
            }
        });

        this.logger.log(`Shipping creado para orden ${context.orderUUID} con status ${context.orderStatus}`);
    }
}
