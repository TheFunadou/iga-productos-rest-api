import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { OrderAndPaymentStatus, OrderPaymentDetails } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/index-browser";
import { PrismaService } from "src/prisma/prisma.service";
import { formatMercadoPagoOrderStatus, isMercadoPagoStatus } from "src/orders/payment/payment.helpers";
import { MercadoPagoPaymentStatus } from "src/orders/payment/payment.dto";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";

export class UpdateOrderStatusStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(UpdateOrderStatusStep.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        const { payment, orderUUID } = context;
        if (!payment || !orderUUID) throw new Error("UpdateOrderStatusStep: context incompleto, falta payment u orderUUID");
        if (!isMercadoPagoStatus(payment.status!)) throw new BadRequestException("Estatus de pago no compatible");

        const result = await this.prisma.$transaction(async (tx) => {
            const existingPayment = await tx.orderPaymentDetails.findUnique({
                where: { payment_id: BigInt(payment.id!) }
            });

            if (existingPayment && existingPayment.payment_status === formatMercadoPagoOrderStatus[payment.status as MercadoPagoPaymentStatus]) {
                this.logger.log(`Pago ${payment.id} ya procesado con status ${payment.status}, omitiendo`);
                return {
                    customerUUID: null,
                    orderStatus: existingPayment.payment_status as OrderAndPaymentStatus,
                    orderId: existingPayment.order_id,
                    skipped: true
                };
            }

            const order = await tx.order.findUnique({
                where: { uuid: orderUUID },
                include: { customer: { select: { uuid: true } }, order_items: true }
            });
            if (!order) throw new NotFoundException("No se encontró la orden que se intenta actualizar");

            const feeAmount = payment.fee_details?.reduce((acc, item) => acc + (item.amount || 0), 0);

            await tx.order.update({
                where: { id: order.id },
                data: { aditional_resource_url: payment.transaction_details?.external_resource_url }
            });

            await tx.orderPaymentDetails.upsert({
                where: { payment_id: BigInt(payment.id!), order_id: order.id },
                create: {
                    order_id: order.id,
                    payment_id: BigInt(payment.id!),
                    last_four_digits: payment.card?.last_four_digits ?? "UNKNOWN",
                    payment_class: payment.payment_type_id ?? "UNKNOWN",
                    payment_method: payment.payment_method_id!,
                    installments: payment.installments!,
                    payment_status: formatMercadoPagoOrderStatus[payment.status as MercadoPagoPaymentStatus],
                    customer_paid_amount: new Decimal(payment.transaction_details?.total_paid_amount!),
                    received_amount: new Decimal(payment.transaction_details?.net_received_amount!),
                    customer_installment_amount: new Decimal(payment.transaction_details?.installment_amount!),
                    fee_amount: feeAmount
                },
                update: {
                    payment_status: formatMercadoPagoOrderStatus[payment.status as MercadoPagoPaymentStatus],
                    last_four_digits: payment.card?.last_four_digits ?? "UNKNOWN",
                    payment_class: payment.payment_type_id ?? "UNKNOWN",
                    payment_method: payment.payment_method_id!,
                    installments: payment.installments!,
                    customer_paid_amount: new Decimal(payment.transaction_details?.total_paid_amount!),
                    received_amount: new Decimal(payment.transaction_details?.net_received_amount!),
                    customer_installment_amount: new Decimal(payment.transaction_details?.installment_amount!),
                    fee_amount: feeAmount
                }
            });

            const allPayments: OrderPaymentDetails[] = await tx.orderPaymentDetails.findMany({ where: { order_id: order.id } });

            let resolvedStatus: OrderAndPaymentStatus = "IN_PROCESS";
            if (allPayments.every(p => p.payment_status === "APPROVED")) resolvedStatus = "APPROVED";
            else if (allPayments.some(p => p.payment_status === "REJECTED")) resolvedStatus = "REJECTED";
            else if (allPayments.some(p => p.payment_status === "CANCELLED")) resolvedStatus = "CANCELLED";
            else if (allPayments.some(p => p.payment_status === "PENDING")) resolvedStatus = "PENDING";

            await tx.order.update({ where: { id: order.id }, data: { status: resolvedStatus } });

            this.logger.log(`Orden ${orderUUID} actualizada a ${resolvedStatus}`);

            return {
                customerUUID: order.customer?.uuid ?? null,
                orderStatus: resolvedStatus,
                orderId: order.id,
                skipped: false
            };
        });

        // Poblar el contexto para que los steps siguientes puedan usar esta info
        context.orderStatus = result.orderStatus;
        context.orderId = result.orderId;
        context.customerUUID = result.customerUUID;
        context.skipped = result.skipped;
    }
}
