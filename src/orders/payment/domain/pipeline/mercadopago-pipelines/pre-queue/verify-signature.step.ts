import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";
import { IStep } from "../pipeline.interface";
import { MercadoPagoWebhookContext } from "../webhook-context";
import { UnauthorizedException } from "@nestjs/common";

export class VerifySignatureStep implements IStep<MercadoPagoWebhookContext> {
    constructor(private readonly mercadopago: MercadoPagoProvider, private readonly nodeEnv: string) { };

    async execute(context: MercadoPagoWebhookContext): Promise<void> {
        if (this.nodeEnv !== "production") return;
        const { xSignature, xRequestId, dataId } = context;
        if (!xSignature || !xRequestId || !dataId) throw new UnauthorizedException("Mercadopago signature headers are missing in production");
        this.mercadopago.verifyWebhookSignature({ xSignature, xRequestId, dataId });
    }
};