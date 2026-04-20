import { Logger } from "@nestjs/common";
import { NotificationsService } from "src/notifications/notifications.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";
import { GetPaymentDetailsService } from "src/orders/payment/services/get-payment-details.service";

export class SendNotificationStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(SendNotificationStep.name);

    constructor(
        private readonly notifications: NotificationsService,
        private readonly payment: GetPaymentDetailsService
    ) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        if (context.orderStatus !== "APPROVED" || context.skipped) return;
        if (!context.orderId || !context.payment) throw new Error("SendNotificationStep: orderId o payment no disponible en contexto");
        const { orderUUID } = context;
        if (!orderUUID) throw new Error("No se encontro el folio de la orden");

        const paymentSummary = await this.payment.executeV2({
            orderUUID, requiredStatus: ["APPROVED"]
        });
        if (paymentSummary.status !== "APPROVED") return;
        if (!paymentSummary.order) return;
        const emailTo = context.payment.payer?.email;
        if (!emailTo) throw new Error("No se encontro un email para este pago");
        this.notifications.sendPaymentApproved({ to: emailTo, data: paymentSummary }).catch((err) => {
            this.logger.error(`Error enviando email de orden aprobada ${orderUUID}: ${err}`);
        });
        context.orderItems = paymentSummary.order.items;
    }
}
