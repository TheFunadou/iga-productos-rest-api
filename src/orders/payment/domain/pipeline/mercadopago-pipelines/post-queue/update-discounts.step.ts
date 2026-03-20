import { BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { isMercadoPagoStatus } from "src/orders/payment/payment.helpers";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";

export class UpdateDiscountsStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(UpdateDiscountsStep.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        const { payment, orderUUID, orderStatus } = context;
        if (!payment || !orderUUID) throw new Error("UpdateOrderStatusStep: context incompleto, falta payment u orderUUID");
        if (!isMercadoPagoStatus(payment.status!)) throw new BadRequestException("Estatus de pago no compatible");
        if (orderStatus !== "APPROVED") return;
        const orderItems = context.orderItems;
        if (!orderItems) throw new Error("UpdateDiscountsStep: orderItems no disponible en contexto");

        for (const item of orderItems) {
            const hasDiscount = item.discount ? (item.discount > 0 ? true : false) : false;
            if (hasDiscount) {


            }
        }

    }
}
