import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderItems } from './payment/payment.dto';
import { GetOrders, GetOrdersQuery, CheckoutOrder, OrderRequestDTO, GetOrderDetails, OrdersDashboardParams, GetOrdersDashboard, OrderRequestFormGuestDTO } from './order.dto';
import { ShoppingCartDTO } from 'src/customer/shopping-cart/shopping-cart.dto';
import { OrderAndPaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { CreateOrderCommand } from './domain/commands/create-order/create-order.command';
import { calcShoppingCartOrderResume } from './orders.helpers';
import { GetCustomerAddressOrder } from 'src/customer/customer-addresses/customer-addresses.dto';

@Injectable()
export class OrdersService {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(OrdersService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly config: ConfigService,
        private readonly commandBus: CommandBus
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async createProviderOrder(args: { orderRequest: OrderRequestDTO, customerUUID?: string }) {
        const { orderRequest, customerUUID } = args;
        const provider = orderRequest.paymentProvider.replaceAll("_", "");
        const notificationUrl = this.nodeEnv !== "production" ? "https://captious-brazenly-gladys.ngrok-free.dev" : "https://api.igaproductos.com"
        return this.commandBus.execute(
            new CreateOrderCommand(
                orderRequest.orderItems,
                "https://igaproductos.com",
                `${notificationUrl}/payment/${provider}/webhook`,
                orderRequest.paymentProvider,
                customerUUID,
                orderRequest.addressUUID,
                orderRequest.couponCode,
                orderRequest.guestForm
            )
        )
    };

    async getOrders({ customerUUID, query: { limit, page, orderBy } }: { customerUUID: string, query: GetOrdersQuery }): Promise<GetOrders> {
        if (limit > 15) throw new BadRequestException("El limite máximo permitido es 15 registros")
        return await this.cache.remember<GetOrders>({
            method: "staleWhileRevalidate",
            entity: "customer:orders",
            query: { customerUUID, limit, page, orderBy },
            fallback: async () => {
                const data = await this.prisma.order.findMany({
                    take: limit,
                    skip: (page - 1) * limit,
                    where: {
                        customer: { uuid: customerUUID },
                    },
                    select: {
                        uuid: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        total_amount: true,
                        aditional_resource_url: true,
                        _count: {
                            select: {
                                order_items: true,
                            },
                        },
                        order_items: {
                            select: {
                                product_version: {
                                    select: {
                                        product_version_images: {
                                            take: 3,
                                            where: { main_image: true },
                                            select: { image_url: true },
                                            orderBy: { main_image: "desc" as const },
                                        },
                                    }
                                }
                            }
                        },
                        shipping: {
                            select: { shipping_status: true }
                        }
                    },
                    orderBy: {
                        created_at: orderBy === "recent" ? "desc" : "asc"
                    }
                });

                const totalRecords = await this.prisma.order.count({ where: { customer: { uuid: customerUUID } } });

                const orders: GetOrders = {
                    data: data.map(or => ({
                        order: {
                            uuid: or.uuid,
                            created_at: or.created_at,
                            status: or.status,
                            total_amount: or.total_amount.toString(),
                            updated_at: or.updated_at,
                            aditional_resource_url: or.aditional_resource_url,
                        },
                        orderItemImages: or.order_items.flatMap((items) => items.product_version.product_version_images.map(img => img.image_url)),
                        totalOrderItems: or._count.order_items,
                        shippingStatus: or.shipping?.shipping_status
                    })),
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                };

                return orders;
            }
        });
    };

    async getOrderDetailsByOrderUUID({ orderUUID, customerUUID }: { orderUUID: string, customerUUID: string }) {
        return await this.cache.remember<GetOrderDetails>({
            method: "staleWhileRevalidate",
            entity: "customer:order:details",
            query: { orderUUID, customerUUID },
            fallback: async () => {
                const order = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID, customer: { uuid: customerUUID } },
                    select: {
                        uuid: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        total_amount: true,
                        aditional_resource_url: true,
                        payment_provider: true,
                        exchange: true,
                        is_guest_order: true,
                        payment_details: {
                            omit: {
                                id: true,
                                order_id: true,
                                payment_id: true,
                                fee_amount: true,
                                received_amount: true
                            }
                        },
                        shipping: {
                            select: {
                                boxes_count: true,
                                shipping_amount: true,
                                carrier: true,
                                tracking_number: true,
                                updated_at: true,
                                shipping_status: true,
                                created_at: true
                            }
                        },
                        order_items: {
                            select: {
                                quantity: true,
                                discount: true,
                                unit_price: true,
                                subtotal: true,
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
                                },
                            }
                        },
                        customer_address: {
                            omit: {
                                id: true,
                                customer_id: true,
                                created_at: true,
                                updated_at: true
                            }
                        },
                    }
                });

                if (!order) throw new NotFoundException("No se encontro la orden");
                if (!order.customer_address) throw new NotFoundException("No se encontro la direccion del destinatario");

                const orderItems: OrderItems[] = order.order_items.map((item) => ({
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

                const resume = calcShoppingCartOrderResume({ shoppingCart: orderItems });

                const response: GetOrderDetails = {
                    status: order.status,
                    order: {
                        address: order.customer_address,
                        items: orderItems,
                        customer: undefined,
                        details: {
                            order: {
                                uuid: order.uuid,
                                total_amount: order.total_amount.toString(),
                                aditional_resource_url: order.aditional_resource_url,
                                created_at: order.created_at,
                                updated_at: order.updated_at,
                                exchange: order.exchange,
                                is_guest_order: order.is_guest_order,
                                payment_provider: order.payment_provider,
                                status: order.status,
                            },
                            payments_details: order.payment_details.map((details) => ({
                                ...details,
                                customer_paid_amount: details.customer_paid_amount.toString(),
                                customer_installment_amount: details.customer_installment_amount.toString()
                            })),
                            shipping: order.shipping ? {
                                boxes_count: order.shipping.boxes_count,
                                shipping_amount: order.shipping.shipping_amount.toString(),
                                carrier: order.shipping.carrier,
                                created_at: order.shipping.created_at,
                                shipping_status: order.shipping.shipping_status,
                                tracking_number: order.shipping.tracking_number,
                                updated_at: order.shipping.updated_at
                            } : null,
                            resume
                        }
                    }
                }
                return response;
            }
        })
    };

    async getCheckoutOrder({ orderUUID, customerUUID }: { orderUUID: string, customerUUID?: string }): Promise<CheckoutOrder> {
        return await this.cache.remember<CheckoutOrder>({
            method: "staleWhileRevalidate",
            entity: "customer:order:checkout",
            query: { orderUUID },
            fallback: async () => {
                const order = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID },
                    select: {
                        uuid: true,
                        external_order_id: true,
                        is_guest_order: true,
                        order_items: {
                            select: {
                                quantity: true,
                                discount: true,
                                unit_price: true,
                                subtotal: true,
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
                        }
                    }
                });

                if (!order) throw new NotFoundException("No se encontro la orden");
                let shippingAddress: GetCustomerAddressOrder | undefined;

                if (!customerUUID && order.is_guest_order) {
                    const guestForm = await this.cache.getData<OrderRequestFormGuestDTO>({
                        entity: "order:guest:data",
                        query: { orderUUID },
                    });
                    if (!guestForm) throw new NotFoundException("No se encontro la información del cliente invitado");

                    shippingAddress = {
                        address_type: guestForm.address_type,
                        city: guestForm.city,
                        state: guestForm.state,
                        street_name: guestForm.street_name,
                        number: guestForm.number,
                        zip_code: guestForm.zip_code,
                        country: guestForm.country,
                        default_address: true,
                        contact_number: guestForm.contact_number,
                        country_phone_code: guestForm.country_phone_code,
                        recipient_name: guestForm.recipient_name,
                        recipient_last_name: guestForm.recipient_last_name,
                        locality: guestForm.locality,
                        neighborhood: guestForm.neighborhood,
                        aditional_number: guestForm.aditional_number,
                        floor: guestForm.floor,
                        references_or_comments: guestForm.references_or_comments,
                    }
                }
                if (!customerUUID && !order.is_guest_order) throw new NotFoundException("No se encontro al cliente asociado a esta orden");
                if (customerUUID && !order.is_guest_order) {
                    const shippingData = await this.prisma.order.findUnique({
                        where: { uuid: orderUUID },
                        select: {
                            customer_address: {
                                omit: {
                                    id: true,
                                    customer_id: true,
                                    created_at: true,
                                    updated_at: true
                                }
                            },
                        }
                    })

                    if (!shippingData?.customer_address) throw new NotFoundException("No se encontro una dirección de envio de este cliente para esta orden");
                    shippingAddress = { ...shippingData.customer_address }
                };

                if (!shippingAddress) throw new BadRequestException("No se encontro una dirección de envio para esta orden");

                const orderItems: OrderItems[] = order.order_items.map((item) => ({
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

                const resume = calcShoppingCartOrderResume({ shoppingCart: orderItems });

                const checkoutOrder: CheckoutOrder = {
                    uuid: order.uuid,
                    address: shippingAddress,
                    items: orderItems,
                    external_id: order.external_order_id,
                    resume
                };

                return checkoutOrder;
            }
        })

    };

    async getBuyNowItem({ sku }: { sku: string }): Promise<ShoppingCartDTO> {
        return await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "buy-now:item",
            query: { sku },
            fallback: async () => {
                const productVersion = await this.prisma.productVersion.findFirst({
                    where: { sku: { equals: sku, mode: "insensitive" } },
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
                });

                if (!productVersion) throw new NotFoundException("No se encontro la versión del producto");
                return {
                    product_version: {
                        sku: productVersion.sku,
                        color_line: productVersion.color_line,
                        color_name: productVersion.color_name,
                        color_code: productVersion.color_code,
                        unit_price: productVersion.unit_price,
                        stock: productVersion.stock,
                        unit_price_with_discount: productVersion.unit_price.toString(),
                    },
                    product_name: productVersion.product.product_name,
                    category: productVersion.product.category.name,
                    subcategories: productVersion.product.subcategories.map((sub) => sub.subcategories.description),
                    product_images: productVersion.product_version_images,
                    quantity: 1,
                    discount: 0,
                    isFavorite: false,
                    isOffer: false,
                    isChecked: true
                };
            }
        })
    };

    async cancelOrder({ orderUUID }: { orderUUID: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.update({
                where: { uuid: orderUUID },
                data: {
                    status: "CANCELLED"
                },
                select: {
                    id: true,
                    customer_id: true,
                    order_items: true
                }
            });

            const shipping = await tx.shipping.findUnique({
                where: { order_id: order.id },
                select: { id: true }
            });

            if (shipping) await tx.shipping.delete({ where: { id: shipping.id } });

            // restore the stock of the products
            for (const item of order.order_items) {
                await tx.productVersion.update({
                    where: { id: item.product_version_id },
                    data: { stock: { increment: item.quantity } }
                });
            };

            return `Orden ${orderUUID} cancelada.`;
        });
    };


    async dashboard({ query: { limit, page, orderby, uuid } }: { query: OrdersDashboardParams }): Promise<GetOrdersDashboard> {
        const skip = (page - 1) * limit;
        const orderBy = orderby || "asc";
        let where = {};
        if (uuid) where = { uuid };

        return await this.cache.remember<GetOrdersDashboard>({
            method: "staleWhileRevalidateWithLock",
            entity: "orders:dashboard",
            query: uuid ? { limit, page, orderby, uuid } : { limit, page, orderby },
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
                        customer_address_id: true,
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
                        shipping_status: order.shipping?.shipping_status ? order.shipping.shipping_status : null,
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

};
