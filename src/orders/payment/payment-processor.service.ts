import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MercadoPagoPaymentStatus } from "./payment.dto";
import { formatMercadoPagoOrderStatus, isMercadoPagoStatus } from "./payment.helpers";
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { Decimal } from "@prisma/client/runtime/index-browser";
import { OrderPaymentDetails } from "@prisma/client";
import { ShippingService } from "src/shipping/shipping.service";
import { ShoppingCartService } from "src/customer/shopping-cart/shopping-cart.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ConfigService } from "@nestjs/config";


@Injectable()
export class PaymentProcessorService {
    private readonly logger = new Logger(PaymentProcessorService.name);
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPayment: Payment;
    private readonly nodeEnv: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly shipping: ShippingService,
        private readonly shoppingCart: ShoppingCartService,
        private readonly notifications: NotificationsService,
        private readonly config: ConfigService
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
        const accessToken = this.nodeEnv === "production" ? this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN") : this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN_TEST");
        if (!accessToken) {
            this.logger.error("Error al cargar modulo de Ordenes");
            throw new Error("Error al cargar modulo de Ordenes");
        };
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

    private async updateProcessingStatus(args: { externalOrderId: string, status: OrderProcessingStatus }) {
        await this.cache.setData<OrderProcessingStatus>({
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

                //    if (orderStatus === "REJECTED" || orderStatus === "CANCELLED") {
                //         await this.restoreProductVersionStock({ tx, orderUUID });
                //     };

                if (orderStatus === "CANCELLED") {
                    await this.restoreProductVersionStock({ tx, orderUUID });
                };

                if (orderStatus === "APPROVED" || orderStatus === "PENDING") {
                    await this.shipping.createShippingByApprovedOrder({
                        tx, orderId, dto: {
                            concept: "Envio de productos",
                            shipping_status: orderStatus === "APPROVED" ? "IN_PREPARATION" : "STAND_BY",
                        }
                    });

                    if (orderStatus === "APPROVED") {
                        try {
                            // Obtener la orden con los datos adicionales estrictos que pide la plantilla de email
                            const orderForEmail = await tx.order.findUnique({
                                where: { id: orderId },
                                include: {
                                    customer: { select: { email: true } },
                                    order_items: {
                                        include: {
                                            product_version: {
                                                include: {
                                                    product: { select: { product_name: true } },
                                                    product_version_images: { where: { main_image: true }, select: { image_url: true } }
                                                }
                                            }
                                        }
                                    }
                                }
                            });

                            if (orderForEmail) {
                                // Si es guest el correo vendrá del payload de MercadoPago
                                const emailTo = orderForEmail.customer?.email || payment.payer?.email;

                                if (emailTo) {
                                    const itemsForEmail = orderForEmail.order_items.map(item => {
                                        const mainImage = item.product_version.product_version_images[0]?.image_url || "";
                                        return {
                                            name: item.product_version.product.product_name,
                                            qty: item.quantity,
                                            image_url: mainImage,
                                            price: Number(item.unit_price) * item.quantity,
                                            discount: item.discount,
                                            finalPrice: Number(item.subtotal)
                                        };
                                    });

                                    const totalStr = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(orderForEmail.total_amount));

                                    // Ejecutar de forma "fire-and-forget" sin await, para NO alentar la respuesta de transacción
                                    this.notifications.sendOrderApproved({
                                        orderUUID: orderForEmail.uuid,
                                        items: itemsForEmail,
                                        total: totalStr,
                                        to: emailTo as string,
                                    }).catch((err: any) => {
                                        this.logger.error(`Error asíncrono enviando email de compra aprobada a la orden ${orderForEmail.uuid}: ${err}`);
                                    });
                                }
                            }
                        } catch (err) {
                            this.logger.error(`Error de DB recolectando datos para email de la orden ${orderId}: ${err}`);
                        }
                    }


                    await this.shoppingCart.updateShoppingCartByApprovedOrder({ customerUUID, orderId });

                    await this.cache.invalidateQuery({ entity: "order:paid:details", query: customerUUID ? { orderUUID, customerUUID } : { orderUUID } });
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

            if (result.customerUUID) {
                await this.cache.invalidateMultipleQueries([
                    {
                        entity: "customer:orders",
                        query: { orderUUID: orderUUID, customerUUID: result.customerUUID }
                    },
                    {
                        entity: "customer:shopping-cart",
                        query: { customerUUID: result.customerUUID }
                    }
                ]);
            };

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