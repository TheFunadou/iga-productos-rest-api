import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OrderAndPaymentStatus } from "generated/prisma/enums";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MercadoPagoPaymentStatus } from "./payment.dto";
import { formatMercadoPagoOrderStatus, isMercadoPagoStatus } from "./payment.helpers";
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { Decimal } from "@prisma/client/runtime/index-browser";


@Injectable()
export class PaymentProcessorService {
    private readonly logger = new Logger(PaymentProcessorService.name);
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPayment: Payment;

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN_TEST;
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

    private async updateOrderStatus(args: { orderUUID: string, paymentStatus: MercadoPagoPaymentStatus, payment: PaymentResponse }) {
        const order = await this.prisma.order.findUnique({ where: { uuid: args.orderUUID }, include: { customer: { select: { uuid: true } } } });
        if (!order) throw new NotFoundException("No se encontro la orden que se intena actualizar");

        await this.prisma.order.update({
            where: { id: order.id },
            data: { aditional_resource_url: args.payment.transaction_details?.external_resource_url }
        });
        // Update PaymentDetails
        if (!isMercadoPagoStatus(args.payment.status!)) throw new BadRequestException("Estatus de pago no soportado");
        if (args.payment.id) throw new BadRequestException("No se encontro el id del pago");
        const feeAmount = args.payment.fee_details?.reduce((acc, item) => {
            if (item.amount) return acc + item.amount;
        }, 0);
        await this.prisma.orderPaymentDetails.upsert({
            where: { payment_id: args.payment.id, order_id: order.id },
            create: {
                order_id: order.id,
                payment_id: args.payment.id!,
                last_four_digits: args.payment.card?.last_four_digits ?? "DESCONOCIDO",
                payment_class: args.payment.payment_type_id ?? "DESCONOCIDO",
                payment_method: args.payment.payment_method_id!,
                installments: args.payment.installments!,
                payment_status: formatMercadoPagoOrderStatus[args.payment.status],
                customer_paid_amount: new Decimal(args.payment.transaction_details?.total_paid_amount!),
                received_amount: new Decimal(args.payment.transaction_details?.net_received_amount!),
                customer_installment_amount: new Decimal(args.payment.transaction_details?.installment_amount!),
                fee_amount: feeAmount
            },
            update: {
                payment_status: formatMercadoPagoOrderStatus[args.payment.status]
            }
        });

        this.logger.log(`Order ${args.orderUUID} updated to ${args.payment.status}`);

        const recheckOrders = await this.prisma.orderPaymentDetails.findMany({ where: { order_id: order.id } });
        // Check if the status of all payments is approved
        if (recheckOrders.map(order => order.payment_status === "APPROVED")) {
            // Update to approved
            await this.prisma.order.update({ where: { id: order.id }, data: { status: "APPROVED", } });
            return { customerUUID: order.customer?.uuid, orderId: order.id, orderStatus: "APPROVED" }
        };
        return { customerUUID: order.customer?.uuid, orderStatus: "PENDING" }
    };

    private async updateProductVersionStock(args: { orderUUID: string }) {
        const order = await this.prisma.order.findUnique({ where: { uuid: args.orderUUID }, include: { order_items: true } });
        if (!order) throw new Error(`No se encontro la orden con UUID: ${args.orderUUID}`);

        for (const item of order.order_items) {
            await this.prisma.productVersion.update({
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
    }

    async processMercadoPagoPayment(args: { paymentId: string }) {
        this.logger.log(`Processing payment for ID: ${args.paymentId}`);
        try {
            const payment = await this.getMercadoPagoPaymentDetails({ paymentId: args.paymentId });
            if (!payment.external_reference) throw new Error("Payment external reference not found (orderUUID)");
            const orderUUID = payment.external_reference;
            const paymentStatus = payment.status;
            this.logger.log(`Payment status for ID: ${args.paymentId} is ${paymentStatus}`);
            if (!isMercadoPagoStatus(paymentStatus!)) throw new BadRequestException("Estatus de pago no compatible");
            const { customerUUID, orderStatus } = await this.updateOrderStatus({ orderUUID, paymentStatus: paymentStatus!, payment });
            if (orderStatus === "APPROVED") await this.updateProductVersionStock({ orderUUID });
            await this.updateProcessingStatus({
                externalOrderId: payment.id!.toString(),
                status: {
                    status: "completed",
                    orderUUID,
                    updatedAt: new Date().toISOString()
                }
            });
            await this.cacheService.invalidateQuery({ entity: "customer:orders", query: { orderUUID: orderUUID, customerUUID: customerUUID } });
            this.logger.log(`Proceso de pago completo satisfactoriamente para la orden ${orderUUID}`);

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
    };

};