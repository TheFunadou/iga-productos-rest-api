import { OrderAndPaymentStatus } from "@prisma/client";
import { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";

export class MercadoPagoPaymentContext {
    public readonly paymentId: string;
    public payment: PaymentResponse | null = null;
    public orderUUID: string | null = null;
    public orderStatus: OrderAndPaymentStatus | null = null;
    public orderId: string | null = null;
    public customerUUID: string | null = null;
    public skipped: boolean = false; // true si el pago ya estaba procesado (idempotencia)

    constructor(args: { paymentId: string }) {
        this.paymentId = args.paymentId;
    }
}
