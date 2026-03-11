import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetPaidOrderDetails, OrderItems, MercadoPagoWebhook } from './payment.dto';
import { OrderAndPaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoProvider } from '../providers/mercado-pago.provider';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    // private readonly mercadoPagoClient: MercadoPagoConfig;
    // private readonly mercadoPagoPayment: Payment;
    private readonly nodeEnv: string;
    // private readonly mercadoPagoWebhookSecret?: string;

    constructor(
        private readonly cacheService: CacheService,
        // @InjectQueue("payment-processing") private readonly paymentQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly mercadopago: MercadoPagoProvider
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
        // const mercadoPagoAccessToken = this.nodeEnv === "production" ? this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN") : this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN_TEST");
        // if (!mercadoPagoAccessToken) {
        //     this.logger.error("Error al cargar modulo de Ordenes");
        //     throw new Error("Error al cargar modulo de Ordenes");
        // };
        // this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: mercadoPagoAccessToken });
        // this.mercadoPagoPayment = new Payment(this.mercadoPagoClient);
        // this.mercadoPagoWebhookSecret = this.config.get<string>("MERCADO_PAGO_WEBHOOK_SECRET");
    };

    // async getMercadoPagoPaymentInfo(args: { orderId: string }) {
    //     return await this.mercadoPagoPayment.get({ id: args.orderId }).catch((error) => {
    //         if (this.nodeEnv === "DEV") {
    //             this.logger.error(`Error al obtener la información de la orden de pago: ${args.orderId}, ${error}`);
    //         };
    //         this.logger.error("Error al obtener la información de la orden de pago");
    //         throw new BadRequestException("Error al obtener la información de la orden de pago");
    //     });
    // };

    async processMercadoPagoPayment(args: MercadoPagoWebhook) {
        const { xSignature, xRequestId, dataId, type } = args;
        if (xSignature && xRequestId && dataId) this.mercadopago.verifyWebhookSignature({ xSignature, xRequestId, dataId });

    }


    // /**
    //  * Agrega un trabajo a la cola de procesamiento de pagos
    //  * @param args { paymentId: string }
    //  */
    // async queuePaymentProcessing(args: { paymentId: string }): Promise<void> {
    //     const jobData: ProcessPaymentJob = {
    //         paymentId: args.paymentId,
    //         externalOrderId: args.paymentId,
    //         timestamp: new Date().toISOString(),
    //     };

    //     await this.paymentQueue.add("process-payment", jobData, {
    //         attempts: 3,
    //         backoff: { type: "exponential", delay: 2000 }
    //     });

    //     this.logger.log(`Payment processing job queued for paymentId: ${args.paymentId}`);
    // };

    /**
     * Obtiene el estado de la orden de pago
     * @param args { externalOrderId: string }
     */
    async getOrderProcessingStatus(args: { externalOrderId: string }): Promise<OrderProcessingStatus | null> {
        try {
            const status = await this.cacheService.getData<OrderProcessingStatus>({
                entity: "payment:status",
                query: { externalOrderId: args.externalOrderId }
            });

            return status || null;
        } catch (error) {
            this.logger.error(`Error al obtener el estado de la orden de pago: ${args.externalOrderId}, ${error}`);
            return null;
        }
    };

    async getOrderStatusByUUID(args: { orderUUID: string }): Promise<OrderProcessingStatus | null> {
        const status = await this.cacheService.getData<OrderProcessingStatus>({
            entity: "payment:status:uuid",
            query: { orderUUID: args.orderUUID }
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(`Error al obtener el status del la orden, ${error}`);
            this.logger.error("Error al obtener el status del la orden");
            throw new BadRequestException("Error al obtener el status de la orden");
        });
        return status || null;
    };


    private async getDetails(args: { orderUUID: string, queryKey: any, orderStatus: OrderAndPaymentStatus }): Promise<GetPaidOrderDetails> {
        const { orderUUID, queryKey, orderStatus } = args;
        return await this.cacheService.remember<GetPaidOrderDetails>({
            method: "staleWhileRevalidate",
            entity: "order:paid:details",
            query: queryKey,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const orderDetail = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID },
                    select: {
                        uuid: true,
                        is_guest_order: true,
                        payment_provider: true,
                        total_amount: true,
                        exchange: true,
                        aditional_resource_url: true,
                        coupon_code: true,
                        created_at: true,
                        updated_at: true,
                        customer_address: {
                            omit: {
                                id: true,
                                customer_id: true,
                                created_at: true,
                                updated_at: true
                            }
                        },
                        payment_details: {
                            omit: {
                                id: true,
                                order_id: true,
                                payment_id: true,
                                fee_amount: true,
                                received_amount: true
                            }
                        },
                        order_items: {
                            select: {
                                quantity: true,
                                unit_price: true,
                                subtotal: true,
                                discount: true,
                                product_version: {
                                    select: {
                                        unit_price: true,
                                        sku: true,
                                        color_line: true,
                                        color_name: true,
                                        color_code: true,
                                        stock: true,
                                        product_version_images: {
                                            where: { main_image: true },
                                            select: { main_image: true, image_url: true },
                                            orderBy: { main_image: "desc" as const }
                                        },
                                        product: {
                                            select: {
                                                id: true,
                                                category_id: true,
                                                product_name: true,
                                                category: { select: { name: true } },
                                                subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        shipping: {
                            select: {
                                boxes_count: true,
                                shipping_amount: true
                            }
                        }
                    }
                });

                if (!orderDetail) throw new NotFoundException("Orden no encontrada");
                if (!orderDetail.customer_address) throw new NotFoundException("Dirección de la orden no encontrada");

                const shoppingCart: OrderItems[] = orderDetail.order_items.map((item) => ({
                    category: item.product_version.product.category.name,
                    subcategories: item.product_version.product.subcategories.map((sub) => sub.subcategories.description),
                    isChecked: true,
                    product_images: item.product_version.product_version_images,
                    product_name: item.product_version.product.product_name,
                    product_version: {
                        color_code: item.product_version.color_code,
                        color_name: item.product_version.color_name,
                        color_line: item.product_version.color_line,
                        sku: item.product_version.sku,
                        unit_price: item.product_version.unit_price,
                        stock: item.product_version.stock,
                        unit_price_with_discount: item.discount > 0 ?
                            (item.discount * (parseFloat(item.product_version.unit_price.toString()) / 100)).toString()
                            : item.product_version.unit_price.toString(),
                    },
                    quantity: item.quantity,
                    discount: item.discount > 0 ? item.discount : undefined,
                    isFavorite: false,
                    subtotal: item.subtotal.toString(),
                    isOffer: item.discount > 0
                }));

                const response = {
                    status: orderStatus,
                    order: {
                        address: orderDetail.customer_address,
                        items: shoppingCart,
                        customer: undefined,
                        details: {
                            order: {
                                uuid: orderDetail.uuid,
                                total_amount: orderDetail.total_amount.toString(),
                                aditional_resource_url: orderDetail.aditional_resource_url,
                                coupon_code: orderDetail.coupon_code,
                                created_at: orderDetail.created_at,
                                updated_at: orderDetail.updated_at,
                                exchange: orderDetail.exchange,
                                is_guest_order: orderDetail.is_guest_order,
                                payment_provider: orderDetail.payment_provider,
                                status: orderStatus,
                            },
                            payments_details: orderDetail.payment_details.map((details) => ({
                                ...details,
                                customer_paid_amount: details.customer_paid_amount.toString(),
                                customer_installment_amount: details.customer_installment_amount.toString()
                            })),
                            shipping: {
                                boxesQty: orderDetail.shipping?.boxes_count,
                                shippingCost: orderDetail.shipping?.shipping_amount.toString()
                            }
                        }
                    }
                };
                return response;
            }
        });
    }

    async getOrderStatusWithDetails(args: { orderUUID: string, customerUUID?: string, requiredStatus: OrderAndPaymentStatus[] }): Promise<GetPaidOrderDetails> {
        const { orderUUID, customerUUID, requiredStatus } = args;
        const queryKey = args.customerUUID ? { orderUUID, customerUUID } : { orderUUID };
        const order = await this.prisma.order.findUnique({ where: { uuid: orderUUID }, select: { status: true } });
        if (!order) throw new NotFoundException("Orden no encontrada");
        if (!requiredStatus.includes(order.status)) return { status: order.status };
        return await this.getDetails({ orderUUID, queryKey, orderStatus: order.status })
    };


    // /**
    //  * Verify the signature of the MercadoPago webhook using HMAC-SHA256.
    //  * Throws UnauthorizedException if the signature is invalid.
    //  * @see https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/payment-notifications
    // */
    // verifyWebhookSignature(args: {
    //     xSignature: string;
    //     xRequestId: string;
    //     dataId: string;
    // }): void {
    //     const { xSignature, xRequestId, dataId } = args;

    //     if (!this.mercadoPagoWebhookSecret) {
    //         this.logger.error('MERCADO_PAGO_WEBHOOK_SECRET no está configurado');
    //         throw new UnauthorizedException('Webhook secret no configurado');
    //     }

    //     // Extraer ts y v1 del header x-signature
    //     // Formato: "ts=<timestamp>,v1=<hash>"
    //     const parts = xSignature.split(',');
    //     let ts: string | undefined;
    //     let v1: string | undefined;

    //     for (const part of parts) {
    //         const [key, value] = part.split('=');
    //         if (key?.trim() === 'ts') ts = value?.trim();
    //         if (key?.trim() === 'v1') v1 = value?.trim();
    //     }

    //     if (!ts || !v1) {
    //         throw new UnauthorizedException('Formato de x-signature inválido');
    //     }

    //     // Construir el template según la documentación oficial de MercadoPago
    //     const signedTemplate = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    //     // Generar HMAC-SHA256
    //     const generatedHash = createHmac('sha256', this.mercadoPagoWebhookSecret)
    //         .update(signedTemplate)
    //         .digest('hex');

    //     // Comparación segura en tiempo constante para evitar timing attacks
    //     const hashBuffer = Buffer.from(generatedHash, 'hex');
    //     const v1Buffer = Buffer.from(v1, 'hex');

    //     if (
    //         hashBuffer.length !== v1Buffer.length ||
    //         !timingSafeEqual(hashBuffer, v1Buffer)
    //     ) {
    //         this.logger.warn(`Firma de webhook inválida para dataId: ${dataId}`);
    //         throw new UnauthorizedException('Firma del webhook inválida');
    //     }

    //     this.logger.log(`Webhook verificado correctamente para dataId: ${dataId}`);
    // };
};
