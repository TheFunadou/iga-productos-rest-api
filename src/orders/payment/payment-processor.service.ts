import { Injectable, Logger } from "@nestjs/common";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";


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

    private async updateOrderStatus(args: { orderUUID: string, paymentStatus: string, payment: any }) {
        const order = await this.prisma.order.findUnique({ where: { uuid: args.orderUUID }, include: { customer: { select: { uuid: true } }, payment_details: true } });
        if (!order) throw new Error(`No se encontro la orden con UUID: ${args.orderUUID}`);

        let orderStatus: string;
        switch (args.paymentStatus) {
            case "approved":
                orderStatus = "paid";
                break;
            case "pending":
            case "in_process":
                orderStatus = "pending_payment";
                break;
            case "rejected":
            case "cancelled":
                orderStatus = "cancelled";
                break;
            default:
                orderStatus = "in_process";
        };

        await this.prisma.order.update({
            where: { uuid: args.orderUUID },
            data: { status: orderStatus }
        });

        const existingPaymentDetail = order.payment_details.find((pd) => pd.payment_class === args.payment.payment_type_id);
        if (!existingPaymentDetail) {
            await this.prisma.orderPaymentDetails.create({
                data: {
                    order_id: order.id,
                    payment_class: args.payment.payment_type_id || "unknown",
                    payment_method: args.payment.payment_method_id,
                    installments: args.payment.installments
                }
            });
        };

        this.logger.log(`Order ${args.orderUUID} updated to ${orderStatus}`);
        return { customerUUID: order.customer!.uuid }

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
            const orderUpdated = await this.updateOrderStatus({ orderUUID, paymentStatus: paymentStatus!, payment });
            if (paymentStatus === "approved") await this.updateProductVersionStock({ orderUUID });
            await this.updateProcessingStatus({
                externalOrderId: payment.id!.toString(),
                status: {
                    status: "completed",
                    orderUUID,
                    updatedAt: new Date().toISOString()
                }
            });
            await this.cacheService.invalidateQuery({ entity: "customer:orders", query: { orderUUID: orderUUID, customerUUID: orderUpdated.customerUUID } });
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