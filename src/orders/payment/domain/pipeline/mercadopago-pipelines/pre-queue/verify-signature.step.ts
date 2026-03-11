import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";
import { IStep } from "../pipeline.interface";
import { MercadoPagoWebhookContext } from "../webhook-context";

export class VerifySignatureStep implements IStep<MercadoPagoWebhookContext> {
    constructor(private readonly mercadopago: MercadoPagoProvider) { };

    async execute(context: MercadoPagoWebhookContext): Promise<void> {
        const { xSignature, xRequestId, dataId } = context;
        if (xSignature && xRequestId && dataId) {
            this.mercadopago.verifyWebhookSignature({ xSignature, xRequestId, dataId });
        }
    }
};