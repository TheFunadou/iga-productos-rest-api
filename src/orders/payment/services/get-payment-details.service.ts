import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderAndPaymentStatus } from "@prisma/client";
import { CacheService } from "src/cache/cache.service";
import { OrderRequestFormGuestDTO } from "src/orders/order.dto";
import { CustomerPaymentData, GetPaidOrderDetails, PaymentDetails } from "../payment.dto";
import { buildAuthCustomerGetPaymentDetailsResponse, buildGuestGetPaymentDetailsResponse, buildPaymentOrderItems } from "../payment.helpers";

@Injectable()
export class GetPaymentDetailsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { };


    private async getGuestData({ orderUUID }: { orderUUID: string }) {
        const guestData = await this.cache.getData<OrderRequestFormGuestDTO>({
            entity: "order:guest:data",
            query: { orderUUID }
        });
        if (!guestData) throw new NotFoundException("Datos de invitado no encontrados");
        return guestData;
    };

    private async getCustomerData({ customerUUID, addressUUID }: { customerUUID: string, addressUUID: string }): Promise<CustomerPaymentData> {
        const customerData = await this.prisma.customer.findUnique({
            where: { uuid: customerUUID },
            select: {
                name: true,
                last_name: true,
                email: true,
                customer_addresses: {
                    where: { uuid: addressUUID },
                    omit: {
                        uuid: true,
                        id: true,
                        customer_id: true,
                        created_at: true,
                        updated_at: true,
                        default_address: true
                    }
                }
            }
        });
        if (!customerData) throw new NotFoundException("Datos de envio no encontrados");
        return customerData;
    }

    private async getPaymentDetails({ orderUUID }: { orderUUID: string }): Promise<PaymentDetails> {
        const response = await this.prisma.order.findUnique({
            where: { uuid: orderUUID },
            select: {
                uuid: true,
                is_guest_order: true,
                payment_provider: true,
                total_amount: true,
                customer_address_id: true,
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
                }
            }
        });

        if (!response) throw new NotFoundException("Orden no encontrada");
        return response;
    }

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
                if (!orderDetails.customer_address_id) throw new BadRequestException("Error al obtener los detalles del pago, no se encontro la direccion de envio");
                const customerData = await this.getCustomerData({ customerUUID, addressUUID: orderDetails.customer_address_id });
                return buildAuthCustomerGetPaymentDetailsResponse({
                    orderDetails,
                    customerData,
                    orderItems,
                    orderStatus: status
                });
            }
        })
    }
}