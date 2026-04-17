import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderAndPaymentStatus } from "@prisma/client";
import { CacheService } from "src/cache/cache.service";
import { OrderRequestFormGuestDTO } from "src/orders/order.dto";
import { GetPaidOrderDetails, PaymentDetails } from "../payment.dto";
import { buildAuthCustomerGetPaymentDetailsResponse, buildGuestGetPaymentDetailsResponse, buildPaymentOrderItems } from "../payment.helpers";
import { OrderDescriptionI, PaymentDetailsI } from "../domain/interfaces/payment.interfaces";
import { ShoppingCartItemsResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { GetCustomerAddressOrder } from "src/customer/customer-addresses/customer-addresses.dto";
import { OrderCheckoutItemI } from "src/orders/applications/pipeline/interfaces/order.interface";
import { calcResume } from "src/orders/helpers/order.helpers";
import { OrdersService } from "src/orders/orders.service";

@Injectable()
export class GetPaymentDetailsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly ordersService: OrdersService
    ) { };


    private async getGuestData({ orderUUID }: { orderUUID: string }) {
        const guestData = await this.cache.getData<OrderRequestFormGuestDTO>({
            entity: "order:guest:data",
            query: { orderUUID }
        });
        if (!guestData) throw new NotFoundException("Datos de invitado no encontrados");
        return guestData;
    };

    private async getPaymentDetails({ orderUUID }: { orderUUID: string }): Promise<PaymentDetails> {
        const response = await this.prisma.order.findUnique({
            where: { uuid: orderUUID },
            select: {
                uuid: true,
                buyer_name: true,
                buyer_surname: true,
                buyer_email: true,
                buyer_phone: true,
                is_guest_order: true,
                payment_provider: true,
                total_amount: true,
                exchange: true,
                aditional_resource_url: true,
                coupon_code: true,
                created_at: true,
                updated_at: true,
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
                },
                shipping_info: {
                    omit: {
                        id: true, order_id: true
                    }
                }
            }
        });

        if (!response) throw new NotFoundException("Orden no encontrada");
        return response;
    }

    private async getDetailsV2({ orderUUID }: { orderUUID: string }): Promise<OrderDescriptionI> {
        const order = await this.ordersService.getCheckoutOrderV2({ orderUUID });
        const paymentDetails = await this.cache.remember({
            method: "staleWhileRevalidate",
            entity: "customer:order:payment-details",
            query: { orderUUID },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 10,
                staleTimeMilliseconds: 1000 * 60 * 8
            },
            fallback: async () => {
                const data = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID },
                    select: {
                        payment_provider: true,
                        is_guest_order: true,
                        buyer_name: true,
                        buyer_surname: true,
                        buyer_email: true,
                        buyer_phone: true,
                        total_amount: true,
                        exchange: true,
                        aditional_resource_url: true,
                        created_at: true,
                        updated_at: true,
                        payment_details: {
                            select: {
                                created_at: true,
                                updated_at: true,
                                last_four_digits: true,
                                payment_class: true,
                                payment_method: true,
                                customer_paid_amount: true,
                                installments: true,
                                payment_status: true
                            }
                        }
                    }
                });

                if (!data) throw new BadRequestException("Orden no encontrada");
                return data;
            }
        });


        return {
            orderUUID: order.orderUUID,
            isGuestOrder: paymentDetails.is_guest_order,
            paymentProvider: paymentDetails.payment_provider,
            buyer: {
                name: paymentDetails.buyer_name,
                surname: paymentDetails.buyer_surname,
                email: paymentDetails.buyer_email,
                phone: paymentDetails.buyer_phone
            },
            totalAmount: parseFloat(paymentDetails.total_amount.toString()).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            exchange: paymentDetails.exchange as "MXN" | "USD",
            aditionalResourceUrl: paymentDetails.aditional_resource_url,
            createdAt: paymentDetails.created_at,
            updatedAt: paymentDetails.updated_at,
            paymentDetails: paymentDetails.payment_details.map(pd => ({
                createdAt: pd.created_at,
                updatedAt: pd.updated_at,
                lastFourDigits: pd.last_four_digits,
                paymentClass: pd.payment_class,
                paymentMethod: pd.payment_method,
                customerPaidAmount: pd.customer_paid_amount,
                installments: pd.installments,
                paymentStatus: pd.payment_status,
                paidAmount: parseFloat(pd.customer_paid_amount.toString()).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }),
            })),
            items: order.items,
            paymentResume: order.resume,
            shipping: order.shippingAddress,
            couponCode: order.couponCode
        } satisfies OrderDescriptionI
    };

    private async pollingStatus(args: { orderUUID: string, requiredStatus: OrderAndPaymentStatus[] }) {
        const { orderUUID, requiredStatus } = args;
        const order = await this.prisma.order.findUnique({
            where: { uuid: orderUUID },
            select: { status: true }
        });
        if (!order) throw new NotFoundException("Orden no encontrada");
        if (!requiredStatus.includes(order.status)) return { status: order.status, includesRequiredStatus: false };
        return { status: order.status, includesRequiredStatus: true };
    };

    async execute(args: { orderUUID: string, customerUUID?: string, requiredStatus: OrderAndPaymentStatus[] }): Promise<GetPaidOrderDetails> {
        const { orderUUID, customerUUID, requiredStatus } = args;
        const buildQueryKey = args.customerUUID ? { orderUUID, customerUUID } : { orderUUID };
        const { includesRequiredStatus, status } = await this.pollingStatus({ orderUUID, requiredStatus });
        if (!includesRequiredStatus) return { status };
        return await this.cache.remember<GetPaidOrderDetails>({
            method: "staleWhileRevalidate",
            entity: "order:payment:details",
            query: buildQueryKey,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 5,
                staleTimeMilliseconds: 1000 * 60 * 3
            },
            fallback: async () => {
                const orderDetails = await this.getPaymentDetails({ orderUUID });
                const orderItems = buildPaymentOrderItems({ orderDetails });
                if (orderDetails.is_guest_order) {
                    const guestData = await this.getGuestData({ orderUUID });
                    return buildGuestGetPaymentDetailsResponse({
                        orderDetails,
                        guestData,
                        orderItems,
                        orderStatus: status
                    });


                };
                if (!customerUUID) throw new BadRequestException("Error al obtener los detalles del pago, no se encontro el cliente");
                return buildAuthCustomerGetPaymentDetailsResponse({
                    orderDetails,
                    customerData: {
                        customer_addresses: [orderDetails.shipping_info!],
                        email: orderDetails.buyer_email!,
                        name: orderDetails.buyer_name!,
                        last_name: orderDetails.buyer_surname!
                    },
                    orderItems,
                    orderStatus: status
                });
            }
        })
    }


    async executeV2(args: { orderUUID: string, requiredStatus: OrderAndPaymentStatus[] }): Promise<PaymentDetailsI> {
        const { orderUUID, requiredStatus } = args;
        const buildQueryKey = { orderUUID };
        const { includesRequiredStatus, status } = await this.pollingStatus({ orderUUID, requiredStatus });
        if (!includesRequiredStatus) return { status };
        return await this.cache.remember<PaymentDetailsI>({
            method: "staleWhileRevalidate",
            entity: "client:payment:details",
            query: buildQueryKey,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 5,
                staleTimeMilliseconds: 1000 * 60 * 3
            },
            fallback: async () => {
                const order = await this.getDetailsV2({ orderUUID });
                return { status, order } satisfies PaymentDetailsI
            }
        })
    }
}