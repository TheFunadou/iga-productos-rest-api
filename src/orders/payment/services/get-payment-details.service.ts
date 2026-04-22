import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderAndPaymentStatus } from "@prisma/client";
import { CacheService } from "src/cache/cache.service";
import { OrderDescriptionI, PaymentDetailsI } from "../application/interfaces/payment.interfaces";
import { OrdersService } from "src/orders/orders.service";
import { GetPaymentDetailsQueryDTO } from "../payment.dto";

@Injectable()
export class GetPaymentDetailsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly ordersService: OrdersService
    ) { };

    private async getDetailsV2({ orderUUID, customerUUID }: { orderUUID: string, customerUUID?: string }): Promise<OrderDescriptionI> {
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
                        status: true,
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

        if (paymentDetails.is_guest_order === false && !customerUUID) throw new BadRequestException("No tienes permisos para ver esta orden");

        const order = await this.ordersService.getCheckoutOrderV2({ orderUUID });

        return {
            orderUUID: order.orderUUID,
            status: paymentDetails.status,
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


    async executeV2(args: { orderUUID: string, query: GetPaymentDetailsQueryDTO, customerUUID?: string }): Promise<PaymentDetailsI> {
        const { orderUUID, query, customerUUID } = args;
        let finalStatus: OrderAndPaymentStatus;
        if (query.enablePolling && query.requiredStatus && query.requiredStatus.length > 0) {
            const { includesRequiredStatus, status } = await this.pollingStatus({ orderUUID, requiredStatus: query.requiredStatus });
            if (!includesRequiredStatus) return { status };
            finalStatus = status;
        };
        return await this.cache.remember<PaymentDetailsI>({
            method: "staleWhileRevalidate",
            entity: "client:payment:details",
            query: { orderUUID },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 5,
                staleTimeMilliseconds: 1000 * 60 * 3
            },
            fallback: async () => {
                const order = await this.getDetailsV2({ orderUUID, customerUUID });
                return { status: finalStatus, order } satisfies PaymentDetailsI
            }
        })
    };
}