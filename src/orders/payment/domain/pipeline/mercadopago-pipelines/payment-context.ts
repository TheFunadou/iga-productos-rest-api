import { Logger } from "@nestjs/common";
import { OrderAndPaymentStatus } from "@prisma/client";
import { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { OrderItems } from "src/orders/payment/payment.dto";

export class MercadoPagoPaymentContext {
    private readonly logger = new Logger("MercadoPagoWebhookQueue")
    public readonly paymentId: string;
    public readonly nodeEnv: string;
    public payment: PaymentResponse | null = null;
    public orderUUID: string | null = null;
    public orderStatus: OrderAndPaymentStatus | null = null;
    public orderId: string | null = null;
    public customerUUID: string | null = null;
    public skipped: boolean = false; // true si el pago ya estaba procesado (idempotencia)
    public orderItems?: OrderItems[];

    constructor(args: { paymentId: string, nodeEnv: string }) {
        this.paymentId = args.paymentId;
        this.nodeEnv = args.nodeEnv;
    }

    conditionalLog(message: string) {
        if (this.nodeEnv === "DEV" || this.nodeEnv === "testing") {
            this.logger.log(`[PAYMENT QUEUE - ${this.paymentId}] ${message}`);
        }
    };

    conditionalError(message: string, error?: any) {
        if (this.nodeEnv === "DEV" || this.nodeEnv === "testing") {
            this.logger.error(`[PAYMENT QUEUE - ${this.paymentId}] ${message}`, error);
        }
    };
}
