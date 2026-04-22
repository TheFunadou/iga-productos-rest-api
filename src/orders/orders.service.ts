import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuyNowItemDTO } from './payment/payment.dto';
import { OrderAndPaymentStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { toOrderCheckoutItemI } from './orders.helpers';
import { GetCustomerAddressOrder } from 'src/customer/customer-addresses/customer-addresses.dto';
import { CreateOrderCommand } from './applications/commands/create-order.command';
import { CheckoutOrderI, GetOrdersSummaryI, PrismaOrderItemsSelectI } from './applications/pipeline/interfaces/order.interface';
import { calcResume } from './helpers/order.helpers';
import { LoadShoppingCartI, ShoppingCartItemsResumeI } from 'src/customer/shopping-cart/application/interfaces/shopping-cart.interface';
import { ProductVersionService } from 'src/product-version/product-version.service';
import { ProductListI } from 'src/product-version/application/pipelines/interfaces/get-cards.interface';
import { toShoppingCartItemsResumeI } from 'src/customer/shopping-cart/helpers';
import { ShoppingCartDTO } from 'src/customer/shopping-cart/application/DTO/shopping-cart.dto';
import { ShoppingCartService } from 'src/customer/shopping-cart/domain/services/shopping-cart.service';
import { CreatedOrder, GetOrdersDashboard, GetOrdersQueryDTO, OrderRequestV2DTO, OrdersDashboardParams } from './payment/application/DTO/order.dto';

@Injectable()
export class OrdersService {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(OrdersService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly config: ConfigService,
        private readonly commandBus: CommandBus,
        private readonly productVersionService: ProductVersionService,
        private readonly shoppingCart: ShoppingCartService
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async createProviderOrder(args: { orderRequest: OrderRequestV2DTO, customerUUID?: string, sessionId: string }): Promise<CreatedOrder> {
        const { orderRequest, customerUUID, sessionId } = args;
        const provider = orderRequest.paymentProvider.replaceAll("_", "");
        const notificationUrl = this.nodeEnv === "DEV" ? "https://captious-brazenly-gladys.ngrok-free.dev" : "https://api.igaproductos.com"
        return this.commandBus.execute(
            new CreateOrderCommand(
                "https://igaproductos.com",
                `${notificationUrl}/payment/${provider}/webhook`,
                orderRequest.paymentProvider,
                sessionId,
                customerUUID,
                orderRequest.addressUUID,
                orderRequest.couponCode,
                orderRequest.guestForm
            )
        )
    };

    async getOrders({ customerUUID, query }: { customerUUID: string, query: GetOrdersQueryDTO }): Promise<GetOrdersSummaryI> {
        const { limit, page, orderBy } = query;
        const skip = ((page ?? 1) - 1) * (limit ?? 15);

        return await this.cache.remember<GetOrdersSummaryI>({
            method: "staleWhileRevalidate",
            entity: "customer:orders",
            query: { customerUUID, query },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 12,
                staleTimeMilliseconds: 1000 * 60 * 15
            },
            fallback: async () => {
                const orders = await this.prisma.order.findMany({
                    where: { customer: { uuid: customerUUID } },
                    take: limit ?? 15,
                    skip,
                    orderBy: { created_at: orderBy ?? "recent" === "recent" ? "desc" : "asc" },
                    select: {
                        uuid: true,
                        created_at: true,
                        updated_at: true,
                        status: true,
                        payment_provider: true,
                        total_amount: true,
                        ...PrismaOrderItemsSelectI,
                    },
                });

                const totalRecords = await this.prisma.order.count({ where: { customer: { uuid: customerUUID } } });
                const totalPages = Math.ceil(totalRecords / (limit ?? 15));

                return {
                    data: orders.map(o => ({
                        uuid: o.uuid,
                        createdAt: o.created_at,
                        updatedAt: o.updated_at,
                        status: o.status,
                        paymentProvider: o.payment_provider,
                        totalAmount: o.total_amount.toString(),
                        items: toOrderCheckoutItemI({ data: o.order_items })
                    })),
                    totalPages,
                    totalRecords,
                    currentPage: page ?? 1
                } satisfies GetOrdersSummaryI;
            }
        })
    };

    async getCheckoutOrderV2({ orderUUID }: { orderUUID: string }): Promise<CheckoutOrderI> {
        return await this.cache.remember<CheckoutOrderI>({
            method: "staleWhileRevalidate",
            entity: "customer:order:checkout",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 10,
                staleTimeMilliseconds: 1000 * 60 * 8
            },
            query: { orderUUID },
            fallback: async () => {
                const order = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID },
                    select: {
                        uuid: true,
                        external_order_id: true,
                        is_guest_order: true,
                        payment_provider: true,
                        coupon_code: true,
                        ...PrismaOrderItemsSelectI,
                        shipping_info: { omit: { id: true, order_id: true } }
                    }
                });

                if (!order) throw new NotFoundException("No se encontro la orden");
                if (!order.shipping_info) throw new NotFoundException("No se encontro la dirección de envio de la orden");
                const shippingAddress: GetCustomerAddressOrder = {
                    ...order.shipping_info,
                    default_address: true
                };
                const items = toOrderCheckoutItemI({ data: order.order_items });

                const resumeItems: ShoppingCartItemsResumeI[] = items.map(item => ({
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    finalPrice: item.finalPrice,
                    isOffer: item.offer.isOffer,
                    discount: item.offer.discount,
                }));

                const resume = calcResume({ items: resumeItems });

                return {
                    orderUUID: order.uuid,
                    shippingAddress,
                    items,
                    externalId: order.external_order_id,
                    resume,
                    couponCode: order.coupon_code,
                } satisfies CheckoutOrderI;
            }
        })

    };

    async getBuyNowItem({ query, customerUUID }: { query: BuyNowItemDTO, customerUUID?: string }): Promise<LoadShoppingCartI> {
        const productsList: ProductListI[] = [{ productUUID: query.productUUID, sku: [query.sku] }];
        const shoppingCartItem: ShoppingCartDTO = {
            item: { sku: query.sku, productUUID: query.productUUID },
            isChecked: true,
            quantity: await this.shoppingCart.resolveStock({ quantity: query.quantity, sku: query.sku })
        };
        const card = await this.productVersionService.getCards({ customerUUID, productsList, scope: "internal" });
        const items = toShoppingCartItemsResumeI({ cards: card.data, shoppingCart: [shoppingCartItem] });
        const resume = calcResume({ items });
        return { cards: card.data, shoppingCart: [shoppingCartItem], resume };
    };

    async cancelOrder({ orderUUID }: { orderUUID: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.update({
                where: { uuid: orderUUID },
                data: {
                    status: "ABANDONED"
                },
                select: {
                    id: true,
                    customer_id: true,
                    order_items: true
                }
            });

            const shipping = await tx.shipping.findMany({
                where: { order_id: order.id },
                select: { id: true },
                take: 1
            });

            if (shipping) await tx.shipping.delete({ where: { id: shipping[0].id } });

            // restore the stock of the products
            for (const item of order.order_items) {
                await tx.productVersion.update({
                    where: { id: item.product_version_id },
                    data: { stock: { increment: item.quantity } }
                });
            };

            return `Orden ${orderUUID} abandonada.`;
        });
    };


    async dashboard({ query }: { query: OrdersDashboardParams }): Promise<GetOrdersDashboard> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const orderBy = query.orderby ?? "asc";
        const uuid = query.uuid;
        const skip = (page - 1) * limit;
        let where: Prisma.OrderWhereInput = {};
        if (uuid) where = { uuid };

        return await this.cache.remember<GetOrdersDashboard>({
            method: "staleWhileRevalidateWithLock",
            entity: "orders:dashboard",
            query: uuid ? { limit, page, orderBy, uuid } : { limit, page, orderBy },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const data = await this.prisma.order.findMany({
                    take: limit,
                    skip,
                    where,
                    orderBy: { created_at: orderBy },
                    omit: {
                        id: true,
                        external_order_id: true,
                        customer_id: true,
                    },
                    include: {
                        shipping: { select: { shipping_status: true } },
                        customer: { select: { uuid: true } }
                    }
                });

                const totalRecords = await this.prisma.order.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                const response: GetOrdersDashboard = {
                    data: data.map((order) => ({
                        ...order,
                        total_amount: order.total_amount.toString(),
                        shipping_status: order.shipping[0]?.shipping_status ? order.shipping[0].shipping_status : null,
                        customer_uuid: order.customer?.uuid
                    })),
                    totalRecords,
                    totalPages,
                };
                return response;
            }
        })
    };

    async updateOrderStatus({ orderUUID, status }: { orderUUID: string, status: OrderAndPaymentStatus }) {
        const order = await this.prisma.order.findUnique({ where: { uuid: orderUUID }, select: { status: true } });
        if (!order) throw new NotFoundException("Orden no encontrada");
        if (order.status === status) throw new BadRequestException("Se esta actualizando al mismo status");

        await this.prisma.order.update({
            where: { uuid: orderUUID },
            data: { status },
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar el status de la orden");
            throw new BadRequestException("Error al actualizar el status de la orden");
        });
    };

    async linkGuestOrderToCustomer({ customerUUID, orderUUID }: { customerUUID: string, orderUUID: string }) {
        const order = await this.prisma.order.findUnique({ where: { uuid: orderUUID }, select: { customer_id: true } });
        if (!order) throw new NotFoundException("Orden no encontrada");
        if (order.customer_id) throw new BadRequestException("La orden ya esta vinculada a un cliente");

        await this.prisma.order.update({
            where: { uuid: orderUUID },
            data: { customer_id: customerUUID },
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al vincular la orden al cliente");
            throw new BadRequestException("Error al vincular la orden al cliente");
        });
    };

};
