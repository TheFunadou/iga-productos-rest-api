import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuyNowItemDTO, OrderItems } from './payment/payment.dto';
import { GetOrders, GetOrdersQuery, CheckoutOrder, OrderRequestV2DTO, GetOrderDetails, OrdersDashboardParams, GetOrdersDashboard, OrderRequestFormGuestDTO, CreatedOrder } from './order.dto';
import { OrderAndPaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { calcShoppingCartOrderResume } from './orders.helpers';
import { GetCustomerAddressOrder } from 'src/customer/customer-addresses/customer-addresses.dto';
import { CreateOrderCommand } from './applications/commands/create-order.command';
import { CheckoutOrderI, OrderCheckoutItemI } from './applications/pipeline/interfaces/order.interface';
import { calcResume } from './helpers/order.helpers';
import { LoadShoppingCartI, ShoppingCartItemsResumeI } from 'src/customer/shopping-cart/application/interfaces/shopping-cart.interface';
import { ProductVersionService } from 'src/product-version/product-version.service';
import { ProductListI } from 'src/product-version/application/pipelines/interfaces/get-cards.interface';
import { toShoppingCartItemsResumeI } from 'src/customer/shopping-cart/helpers';
import { ShoppingCartDTO } from 'src/customer/shopping-cart/application/DTO/shopping-cart.dto';
import { ShoppingCartService } from 'src/customer/shopping-cart/domain/services/shopping-cart.service';

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
                        shippingStatus: or.shipping[0].shipping_status
                    })),
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                };

                return orders;
            }
        });
    };

    async getOrderDetailsByOrderUUID({ orderUUID, customerUUID }: { orderUUID: string, customerUUID?: string }) {
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
                        buyer_name: true,
                        buyer_surname: true,
                        buyer_email: true,
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
                        shipping_info: {
                            omit: { id: true, order_id: true }
                        },
                    }
                });

                if (!order) throw new NotFoundException("No se encontro la orden");
                if (!order.shipping_info) throw new NotFoundException("No se encontro la direccion del destinatario");

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
                        unit_price: item.unit_price,
                        stock: item.product_version.stock,
                        unit_price_with_discount: item.discount > 0 ?
                            (item.discount * (parseFloat(item.unit_price.toString()) / 100)).toString()
                            : item.unit_price.toString(),
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
                        address: { ...order.shipping_info, default_address: true },
                        items: orderItems,
                        customer: { email: order.buyer_email, name: order.buyer_name, last_name: order.buyer_surname },
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
                            shipping: order.shipping.length > 0 ? {
                                boxes_count: order.shipping[0].boxes_count,
                                shipping_amount: order.shipping[0].shipping_amount.toString(),
                                carrier: order.shipping[0].carrier,
                                created_at: order.shipping[0].created_at,
                                shipping_status: order.shipping[0].shipping_status,
                                tracking_number: order.shipping[0].tracking_number,
                                updated_at: order.shipping[0].updated_at
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
                            shipping_info: {
                                omit: {
                                    id: true,
                                    order_id: true
                                }
                            },
                        }
                    })

                    if (!shippingData?.shipping_info) throw new NotFoundException("No se encontro una dirección de envio de este cliente para esta orden");
                    shippingAddress = { ...shippingData.shipping_info, default_address: true }
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
                        order_items: {
                            select: {
                                quantity: true,
                                discount: true,
                                unit_price: true,
                                final_price: true,
                                isOffer: true,
                                subtotal: true,
                                product_version: {
                                    select: {
                                        unit_price: true,
                                        sku: true,
                                        color_line: true,
                                        color_name: true,
                                        color_code: true,
                                        product_version_images: {
                                            select: { main_image: true, image_url: true },
                                            orderBy: { main_image: "desc" as const }
                                        },
                                        product: {
                                            select: {
                                                product_name: true,
                                                category: { select: { name: true } },
                                                subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        shipping_info: { omit: { id: true, order_id: true } }
                    }
                });

                if (!order) throw new NotFoundException("No se encontro la orden");
                if (!order.shipping_info) throw new NotFoundException("No se encontro la dirección de envio de la orden");
                const shippingAddress: GetCustomerAddressOrder = {
                    ...order.shipping_info,
                    default_address: true
                };

                const items: OrderCheckoutItemI[] = order.order_items.map(items => ({
                    name: items.product_version.product.product_name,
                    category: items.product_version.product.category.name,
                    subcategories: items.product_version.product.subcategories.map(sub => ({ uuid: sub.subcategories.uuid, name: sub.subcategories.description })),
                    sku: items.product_version.sku,
                    color: {
                        line: items.product_version.color_line,
                        name: items.product_version.color_name,
                        code: items.product_version.color_code,
                    },
                    unitPrice: items.unit_price.toString(),
                    finalPrice: items.final_price.toString(),
                    quantity: items.quantity,
                    offer: {
                        isOffer: items.isOffer,
                        discount: items.discount,
                    },
                    subtotal: items.subtotal.toString(),
                    images: items.product_version.product_version_images.map((image) => ({
                        url: image.image_url,
                        mainImage: image.main_image,
                    })),
                }));

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

};
