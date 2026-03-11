import { BadRequestException } from "@nestjs/common";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";
import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";

export class FetchPaymentDetailsStep implements IStep<MercadoPagoPaymentContext> {
    constructor(private readonly mercadopago: MercadoPagoProvider) { };
    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        const payment = await this.mercadopago.getPaymentDetails({ paymentId: context.paymentId });
        if (!payment.external_reference) throw new BadRequestException("Ocurrio un error al procesar el pago, no se encontro el external_reference (UUID de la orden)");
        context.payment = payment;
        context.orderUUID = payment.external_reference;
    }
};