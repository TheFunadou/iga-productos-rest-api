import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from "mercadopago";
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GuestOrderData } from '../order.dto';
import { GetPaidOrderDetails, OrderItems } from './payment.dto';
import { ShoppingCartDTO } from 'src/customer/shopping-cart/shopping-cart.dto';
import { OrderAndPaymentStatus } from 'generated/prisma/enums';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPayment: Payment;

    constructor(
        private readonly cacheService: CacheService,
        @InjectQueue("payment-processing") private readonly paymentQueue: Queue,
        private readonly prisma: PrismaService,
    ) {
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: this.mercadoPagoAccessToken! });
        this.mercadoPagoPayment = new Payment(this.mercadoPagoClient);
    };

    async getMercadoPagoPaymentInfo(args: { orderId: string }) {
        return await this.mercadoPagoPayment.get({ id: args.orderId }).catch((error) => {
            throw new BadRequestException("Error al obtener la información de la orden de pago");
        });
    };

    /**
     * Agrega un trabajo a la cola de procesamiento de pagos
     * @param args { paymentId: string }
     */
    async queuePaymentProcessing(args: { paymentId: string }): Promise<void> {
        const jobData: ProcessPaymentJob = {
            paymentId: args.paymentId,
            externalOrderId: args.paymentId,
            timestamp: new Date().toISOString(),
        };

        await this.paymentQueue.add("process-payment", jobData, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 }
        });

        this.logger.log(`Payment processing job queued for paymentId: ${args.paymentId}`);
    };

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
        try {
            const status = await this.cacheService.getData<OrderProcessingStatus>({
                entity: "payment:status:uuid",
                query: { orderUUID: args.orderUUID }
            });
            return status || null;
        } catch (error) {
            this.logger.error(`Error al obtener el estado de la orden de pago: ${args.orderUUID}, ${error}`);
            return null;
        }
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
                                boxesQty: orderDetail.shipping[0].boxes_count,
                                shippingCost: orderDetail.shipping[0].shipping_amount.toString()
                            }
                        }
                    }
                }
                return response;
            }
        });
    }

    async getOrderStatusWithDetails(args: { orderUUID: string, customerUUID?: string, requiredStatus: OrderAndPaymentStatus }): Promise<GetPaidOrderDetails> {
        const { orderUUID } = args;
        const queryKey = args.customerUUID ? { orderUUID: args.orderUUID, customerUUID: args.customerUUID } : { orderUUID: args.orderUUID };
        const order = await this.prisma.order.findUnique({ where: { uuid: args.orderUUID }, select: { status: true } });
        if (!order) throw new NotFoundException("Orden no encontrada");
        if (order.status !== args.requiredStatus) return { status: order.status }
        return await this.getDetails({ orderUUID, queryKey, orderStatus: order.status })
    };


    // async getProccessedPaymentDetails(args: { orderUUID: string, customerUUID?: string }): Promise<GetSuccessPaymentProcessed> {
    //     const queryKey = args.customerUUID ? { orderUUID: args.orderUUID, customerUUID: args.customerUUID } : { orderUUID: args.orderUUID };
    //     return await this.cacheService.remember({
    //         method: "simpleFind",
    //         entity: "order:proccesed:details",
    //         query: queryKey,
    //         aditionalOptions: {
    //             ttlMilliseconds: 1000 * 60 * 5
    //         },
    //         fallback: async () => {
    //             if (args.customerUUID) {
    //                 const order = await this.prisma.order.findUnique({
    //                     where: { uuid: args.orderUUID, customer: { uuid: args.customerUUID } },
    //                     select: {
    //                         uuid: true,
    //                         payment_provider: true,
    //                         coupon_code: true,
    //                         customer_address: {
    //                             omit: {
    //                                 id: true,
    //                                 customer_id: true,
    //                                 created_at: true,
    //                                 updated_at: true
    //                             }
    //                         },
    //                         order_items: {
    //                             select: {
    //                                 quantity: true,
    //                                 unit_price: true,
    //                                 subtotal: true,
    //                                 product_version: {
    //                                     select: {
    //                                         unit_price: true,
    //                                         sku: true,
    //                                         color_line: true,
    //                                         color_name: true,
    //                                         color_code: true,
    //                                         stock: true,
    //                                         product_version_images: {
    //                                             where: { main_image: true },
    //                                             select: { main_image: true, image_url: true },
    //                                             orderBy: { main_image: "desc" as const }
    //                                         },
    //                                         product: {
    //                                             select: {
    //                                                 id: true,
    //                                                 category_id: true,
    //                                                 product_name: true,
    //                                                 category: { select: { name: true } },
    //                                                 subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
    //                                             }
    //                                         }
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                     }
    //                 });
    //                 if (!order) throw new NotFoundException("Orden no encontrada");


    //                 // const shoppingCart:ShoppingCartDTO[] = order.order_items.map((items) => ({
    //                 //     category: items.product_version.product.category.name,
    //                 //     isChecked: true,
    //                 //     product_images: items.product_version.product_version_images,
    //                 //     product_name: items.product_version.product.product_name,
    //                 //     quantity: items.quantity,
    //                 //     product_version: {
    //                 //         color_code: items.product_version.color_code,
    //                 //         color_name: items.product_version.color_name,
    //                 //         color_line: items.product_version.color_line,
    //                 //         unit_price: items.product_version.unit_price,
    //                 //         sku: items.product_version.sku,
    //                 //         stock: items.product_version.stock,
    //                 //         code_bar: null,
    //                 //         unit_price_with_discount: items.
    //                 //     }
    //                 // }))

    //                 return order;
    //             } else {
    //                 const order = await this.prisma.order.findUnique({
    //                     where: { uuid: args.orderUUID, customer: { uuid: args.customerUUID } },
    //                     select: {
    //                         uuid: true,
    //                         payment_provider: true,
    //                         coupon_code: true,
    //                         order_items: {
    //                             select: {
    //                                 quantity: true,
    //                                 unit_price: true,
    //                                 subtotal: true,
    //                                 product_version: {
    //                                     select: {
    //                                         unit_price: true,
    //                                         sku: true,
    //                                         color_line: true,
    //                                         color_name: true,
    //                                         color_code: true,
    //                                         stock: true,
    //                                         product_version_images: {
    //                                             where: { main_image: true },
    //                                             select: { main_image: true, image_url: true },
    //                                             orderBy: { main_image: "desc" as const }
    //                                         },
    //                                         product: {
    //                                             select: {
    //                                                 id: true,
    //                                                 category_id: true,
    //                                                 product_name: true,
    //                                                 category: { select: { name: true } },
    //                                                 subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
    //                                             }
    //                                         }
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                     }
    //                 });

    //                 if (!order) throw new NotFoundException("Orden no encontrada");

    //                 const guestOrderData = await this.cacheService.getData<GuestOrderData | null>({
    //                     entity: "order:guest:customer:data",
    //                     query: { orderUUID: args.orderUUID }
    //                 });

    //                 if (!guestOrderData) throw new NotFoundException("Datos del cliente invitado no encontrados");

    //                 return {
    //                     address: guestOrderData.address,
    //                     items: [],

    //                 }
    //             }
    //         }
    //     });
    // };
};
