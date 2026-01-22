import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MercadoPagoPaymentStatus } from "./payment.dto";
import { formatMercadoPagoOrderStatus, isMercadoPagoStatus } from "./payment.helpers";
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { Decimal } from "@prisma/client/runtime/index-browser";
import { OrderPaymentDetails } from "generated/prisma/client";
import { ShippingService } from "src/shipping/shipping.service";


@Injectable()
export class PaymentProcessorService {
    private readonly logger = new Logger(PaymentProcessorService.name);
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPayment: Payment;

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly shippingService: ShippingService
    ) {
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: accessToken! });
        this.mercadoPagoPayment = new Payment(this.mercadoPagoClient);
    };

    private async getMercadoPagoPaymentDetails(args: { paymentId: string }) {
        try {
            const payment = await this.mercadoPagoPayment.get({ id: args.paymentId });
            this.logger.log(`Payment details retrieved for ID: ${args.paymentId}`);
            return payment;
        } catch (error) {
            this.logger.error(`Error retrieving payment details for ID: ${args.paymentId}`);
            throw error;
        };
    };

    private async updateOrderStatus(args: { tx: any, orderUUID: string, paymentStatus: MercadoPagoPaymentStatus, payment: PaymentResponse }) {
        const order = await args.tx.order.findUnique({
            where: { uuid: args.orderUUID },
            include: { customer: { select: { uuid: true } }, order_items: true }
        });
        if (!order) throw new NotFoundException("No se encontro la orden que se intena actualizar");
        if (!isMercadoPagoStatus(args.payment.status!)) throw new BadRequestException("Estatus de pago no soportado");
        if (!args.payment.id) throw new BadRequestException("No se encontro el id del pago");

        const feeAmount = args.payment.fee_details?.reduce((acc, item) => acc + (item.amount || 0), 0);
        await args.tx.order.update({
            where: { id: order.id },
            data: { aditional_resource_url: args.payment.transaction_details?.external_resource_url }
        });

        await args.tx.orderPaymentDetails.upsert({
            where: { payment_id: BigInt(args.payment.id!), order_id: order.id },
            create: {
                order_id: order.id,
                payment_id: BigInt(args.payment.id!),
                last_four_digits: args.payment.card?.last_four_digits ?? "UNKNOWN",
                payment_class: args.payment.payment_type_id ?? "UNKNOWN",
                payment_method: args.payment.payment_method_id!,
                installments: args.payment.installments!,
                payment_status: formatMercadoPagoOrderStatus[args.payment.status],
                customer_paid_amount: new Decimal(args.payment.transaction_details?.total_paid_amount!),
                received_amount: new Decimal(args.payment.transaction_details?.net_received_amount!),
                customer_installment_amount: new Decimal(args.payment.transaction_details?.installment_amount!),
                fee_amount: feeAmount
            },
            update: {
                payment_status: formatMercadoPagoOrderStatus[args.payment.status],
                last_four_digits: args.payment.card?.last_four_digits ?? "UNKNOWN",
                payment_class: args.payment.payment_type_id ?? "UNKNOWN",
                payment_method: args.payment.payment_method_id!,
                installments: args.payment.installments!,
                customer_paid_amount: new Decimal(args.payment.transaction_details?.total_paid_amount!),
                received_amount: new Decimal(args.payment.transaction_details?.net_received_amount!),
                customer_installment_amount: new Decimal(args.payment.transaction_details?.installment_amount!),
                fee_amount: feeAmount
            }
        });

        this.logger.log(
            `Payment ${args.payment.id} upserted with status ${args.payment.status}. ` +
            `Amounts: paid=${args.payment.transaction_details?.total_paid_amount}, ` +
            `received=${args.payment.transaction_details?.net_received_amount}, ` +
            `installment=${args.payment.transaction_details?.installment_amount}`
        );

        this.logger.log(`Order ${args.orderUUID} updated to ${args.payment.status}`);

        const allPayments: OrderPaymentDetails[] = await args.tx.orderPaymentDetails.findMany({ where: { order_id: order.id } });
        if (allPayments.every(payment => payment.payment_status === "APPROVED")) {
            await args.tx.order.update({ where: { id: order.id }, data: { status: "APPROVED" } });
            return { customerUUID: order.customer?.uuid, orderId: order.id, orderStatus: "APPROVED" as const, orderItems: order.order_items }
        };

        if (allPayments.some(payment => payment.payment_status === "REJECTED")) {
            await args.tx.order.update({ where: { id: order.id }, data: { status: "REJECTED" } });
            return { customerUUID: order.customer?.uuid, orderId: order.id, orderStatus: "REJECTED" as const, orderItems: order.order_items }
        };

        if (allPayments.some(payment => payment.payment_status === "CANCELLED")) {
            await args.tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
            return { customerUUID: order.customer?.uuid, orderId: order.id, orderStatus: "CANCELLED" as const, orderItems: order.order_items }
        };

        if (allPayments.some(payment => payment.payment_status === "PENDING")) {
            await args.tx.order.update({ where: { id: order.id }, data: { status: "PENDING" } });
            return { customerUUID: order.customer?.uuid, orderId: order.id, orderStatus: "PENDING" as const, orderItems: order.order_items }
        };

        await args.tx.order.update({ where: { id: order.id }, data: { status: "IN_PROCESS" } });
        return { customerUUID: order.customer?.uuid, orderId: order.id, orderStatus: "IN_PROCESS" as const, orderItems: order.order_items }
    };

    private async updateProductVersionStock(args: { tx: any, orderUUID: string }) {
        const order = await args.tx.order.findUnique({ where: { uuid: args.orderUUID }, include: { order_items: true } });
        if (!order) throw new Error(`No se encontro la orden con UUID: ${args.orderUUID}`);

        for (const item of order.order_items) {
            await args.tx.productVersion.update({
                where: { id: item.product_version_id },
                data: { stock: { decrement: item.quantity } }
            });

            this.logger.log(`Stock actualizado para el producto ${item.product_version_id}: -${item.quantity}`);
        };

    };

    private async updateProcessingStatus(args: { externalOrderId: string, status: OrderProcessingStatus }) {
        await this.cacheService.setData<OrderProcessingStatus>({
            entity: "payment:status",
            query: { externalOrderId: args.externalOrderId },
            data: args.status,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60
            }
        });
    };

    // payment-processor.service.ts - Agregar después de updateProductVersionStock
    private async restoreProductVersionStock(args: { tx: any, orderUUID: string }) {
        const order = await args.tx.order.findUnique({
            where: { uuid: args.orderUUID },
            include: { order_items: true }
        });

        if (!order) throw new Error(`No se encontro la orden con UUID: ${args.orderUUID}`);

        for (const item of order.order_items) {
            await args.tx.productVersion.update({
                where: { id: item.product_version_id },
                data: { stock: { increment: item.quantity } }
            });

            this.logger.log(`Stock restaurado para el producto ${item.product_version_id}: +${item.quantity}`);
        }
    };

    async processMercadoPagoPayment(args: { paymentId: string }) {
        this.logger.log(`Processing payment for ID: ${args.paymentId}`);

        try {
            const payment = await this.getMercadoPagoPaymentDetails({ paymentId: args.paymentId });
            if (!payment.external_reference) throw new Error("Payment external reference not found (orderUUID)");

            const orderUUID = payment.external_reference;
            const paymentStatus = payment.status;

            this.logger.log(`Payment status for ID: ${args.paymentId} is ${paymentStatus}`);
            if (!isMercadoPagoStatus(paymentStatus!)) throw new BadRequestException("Estatus de pago no compatible");

            const result = await this.prisma.$transaction(async (tx) => {
                const existingPayment = await tx.orderPaymentDetails.findUnique({
                    where: { payment_id: BigInt(args.paymentId) }
                });

                if (existingPayment && existingPayment.payment_status === formatMercadoPagoOrderStatus[paymentStatus!]) {
                    this.logger.log(`Payment ${args.paymentId} already in database with status ${paymentStatus}, skipping`);
                    return {
                        customerUUID: null,
                        orderStatus: existingPayment.payment_status,
                        orderId: existingPayment.order_id,
                        skipped: true
                    };
                }

                const { customerUUID, orderStatus, orderId } = await this.updateOrderStatus({
                    tx, orderUUID, paymentStatus: paymentStatus!, payment
                });

                if (orderStatus === "REJECTED" || orderStatus === "CANCELLED") {
                    await this.restoreProductVersionStock({ tx, orderUUID });
                };

                if (orderStatus === "APPROVED" || orderStatus === "PENDING") {
                    await this.shippingService.createShippingByApprovedOrder({
                        tx, orderId, dto: {
                            concept: "Envio de productos",
                            shipping_status: orderStatus === "APPROVED" ? "IN_PREPARATION" : "STAND_BY",
                        }
                    });
                };

                return { customerUUID, orderStatus, orderId, skipped: false };
            });

            await this.updateProcessingStatus({
                externalOrderId: payment.id!.toString(),
                status: {
                    status: "completed",
                    orderUUID,
                    updatedAt: new Date().toISOString()
                }
            });

            await this.cacheService.invalidateQuery({
                entity: "customer:orders",
                query: { orderUUID: orderUUID, customerUUID: result.customerUUID }
            });

            this.logger.log(`Proceso de pago completado satisfactoriamente para la orden ${orderUUID}`);

        } catch (error) {
            this.logger.error(`Error al procesar el pago para la orden ${args.paymentId}: ${error}`);

            await this.updateProcessingStatus({
                externalOrderId: args.paymentId,
                status: {
                    status: "failed",
                    updatedAt: new Date().toISOString(),
                    error: error instanceof Error ? error.message : "unknown error"
                }
            });
            throw error;
        }
    }


};