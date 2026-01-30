import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderItems, OrderReadyToPay } from './payment/payment.dto';
import { GetOrders, GetOrdersQuery, GuestOrderData, CheckoutOrder, OrderRequestDTO, OrderRequestGuestDTO, OrderDetails, GetOrderDetails } from './order.dto';
import { ProductVersionFindService } from 'src/product-version/product-version.find.service';
import { OrderUtilsService } from './order.utils.service';
import { MercadoPagoConfig, Preference as MercadoPagoPreference, Order, Preference } from "mercadopago";
import { PaginationDTO } from 'src/common/DTO/pagination.dto';

@Injectable()
export class OrdersService {
    private readonly nodeEnv = process.env.NODE_ENV;
    private readonly mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPreference: MercadoPagoPreference;

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly productVersionFindService: ProductVersionFindService,
        private readonly orderUtilsService: OrderUtilsService,
    ) {
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: this.mercadoPagoAccessToken! });
        this.mercadoPagoPreference = new Preference(this.mercadoPagoClient);
    };

    async createMercadoPagoOrderAuthCustomer(args: { orderRequest: OrderRequestDTO, customerUUID: string }): Promise<OrderReadyToPay> {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID } });
            if (!customer) throw new NotFoundException("Error inesperado al crear la orden, no se encontro al cliente");
            const customerAddress = await tx.customerAddresses.findUnique({ where: { uuid: args.orderRequest.address } });
            if (!customerAddress) throw new NotFoundException("Error inesperado al crear la orden, no se encontro la dirección de envio");
            const itemsSKUList = args.orderRequest.shopping_cart.map((item) => item.product);
            const itemCards = await this.productVersionFindService.searchCardsBySKUList({ tx, skuList: itemsSKUList, customerUUID: args.customerUUID, couponCode: args.orderRequest.coupon_code }).catch((error) => {
                throw new BadRequestException(`Error al obtener las tarjetas de prodcutos ${this.nodeEnv === "DEVELOPMENT" && `: ${error}`}`)
            });
            const items = this.orderUtilsService.buildMercadoPagoOrderItems({ items: itemCards, shoppingCart: args.orderRequest.shopping_cart });
            const vigency = this.orderUtilsService.buildMercadoPagoPaymentVigency();
            const shoppingCart = this.orderUtilsService.buildShoppingCart({ productVersionCards: itemCards, orderRequest: args.orderRequest });

            for (const item of shoppingCart) {
                const product = await tx.productVersion.findUnique({
                    where: { sku: item.product_version.sku },
                    select: { stock: true }
                });

                if (!product || product.stock < item.quantity) throw new BadRequestException("Stock insuficente para realizar la operación");
            };

            for (const item of shoppingCart) {
                await tx.productVersion.update({
                    where: { sku: item.product_version.sku },
                    data: { stock: { decrement: item.quantity } }
                })
            };

            const orderResume = this.orderUtilsService.calcOrderResume({ shoppingCart });
            const orderUUID = crypto.randomUUID().toString();
            const body = this.orderUtilsService.buildMercadoPagoPreferenceBodyAuthCustomer({
                internalOrderId: orderUUID, items, shoppingCart, vigency, customer, customerAddress, shippingCost: orderResume.shippingCost,
            });
            const preference = await this.mercadoPagoPreference.create(body).catch((error) => {
                throw new BadRequestException(`Error al crear la orden de pago 1 ${this.nodeEnv === "DEVELOPMENT" && `: ${error.message}`}`)
            });
            if (!preference.id) throw new BadRequestException(`Error al crear la preferencia de pago`);
            const order = await tx.order.create({
                data: {
                    uuid: orderUUID,
                    external_order_id: preference.id,
                    customer_address_id: customerAddress.id,
                    customer_id: customer.id,
                    payment_provider: "mercado_pago",
                    status: "IN_PROCESS",
                    total_amount: orderResume.total,
                    exchange: "MXN",
                },
            }).catch((error) => { throw new BadRequestException(`Error al crear la orden de pago 2 ${this.nodeEnv === "DEVELOPMENT" && `: ${error.message}`}`) });

            for (const item of items) {
                const productVersion = await tx.productVersion.findUnique({ where: { sku: item.id }, select: { id: true } });
                const shoppingCartItem = shoppingCart.find((cartItem) => cartItem.product_version.sku === item.id);
                if (!shoppingCartItem) throw new BadRequestException(`Error al crear la orden de pago 3 ${this.nodeEnv === "DEVELOPMENT" && `: No se encontro el item del carrito ${item.id}`}`);
                if (!productVersion) throw new BadRequestException(`Error al crear la orden de pago 3 ${this.nodeEnv === "DEVELOPMENT" && `: No se encontro la version del producto ${item.id}`}`);
                await tx.orderItemsDetails.create({
                    data: {
                        order_id: order.id,
                        product_version_id: productVersion.id,
                        quantity: item.quantity,
                        unit_price: shoppingCartItem.product_version.unit_price,
                        subtotal: item.unit_price * item.quantity,
                        discount: shoppingCartItem.discount,
                    },
                });
            };
            return {
                folio: orderUUID,
                // items: shoppingCart,
                external_id: preference.id,
                // receiver_address: customerAddress,
                payment_method: "mercado_pago",
                // resume: orderResume
            };

        });
    };

    async createMercadoPagoOrderGuest(args: { orderRequest: OrderRequestGuestDTO }): Promise<OrderReadyToPay> {
        return await this.prisma.$transaction(async (tx) => {
            const itemsSKUList = args.orderRequest.shopping_cart.map((item) => item.product);
            const itemCards = await this.productVersionFindService.searchCardsBySKUList({ tx, skuList: itemsSKUList });
            const items = this.orderUtilsService.buildMercadoPagoOrderItems({ items: itemCards, shoppingCart: args.orderRequest.shopping_cart });
            const vigency = this.orderUtilsService.buildMercadoPagoPaymentVigency();
            const shoppingCart = this.orderUtilsService.buildShoppingCart({ productVersionCards: itemCards, orderRequest: args.orderRequest });

            for (const item of shoppingCart) {
                const product = await tx.productVersion.findUnique({
                    where: { sku: item.product_version.sku },
                    select: { stock: true }
                });

                if (!product || product.stock < item.quantity) throw new BadRequestException("Stock insuficente para realizar la operación");
            };

            for (const item of shoppingCart) {
                await tx.productVersion.update({
                    where: { sku: item.product_version.sku },
                    data: { stock: { decrement: item.quantity } }
                })
            };

            const orderUUID = crypto.randomUUID().toString();
            const orderResume = this.orderUtilsService.calcOrderResume({ shoppingCart });
            const body = this.orderUtilsService.buildMercadoPagoPreferenceBodyAuthCustomer({
                internalOrderId: orderUUID, items, shoppingCart, vigency, customer: args.orderRequest.guest, customerAddress: args.orderRequest.address, shippingCost: orderResume.shippingCost
            });
            const preference = await this.mercadoPagoPreference.create(body);
            if (!preference.id) throw new BadRequestException("Error al crear la orden de pago");
            const order = await tx.order.create({
                data: {
                    uuid: orderUUID,
                    external_order_id: preference.id,
                    payment_provider: "mercado_pago",
                    is_guest_order: true,
                    status: "IN_PROCESS",
                    total_amount: orderResume.total,
                    exchange: "MXN",
                },
            }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });

            await this.cacheService.setData<GuestOrderData>({
                entity: "order:guest:customer:data",
                query: { orderUUID },
                data: {
                    customer: args.orderRequest.guest,
                    address: args.orderRequest.address,
                    createdAt: new Date().toISOString(),
                }
            }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });

            for (const item of items) {
                const productVersion = await tx.productVersion.findUnique({ where: { sku: item.id }, select: { id: true } });
                if (!productVersion) throw new BadRequestException(`Error al crear la orden de pago 3 ${this.nodeEnv === "DEVELOPMENT" && `: No se encontro la version del producto ${item.id}`}`);
                await tx.orderItemsDetails.create({
                    data: {
                        order_id: order.id,
                        product_version_id: productVersion.id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        subtotal: item.unit_price * item.quantity,
                    },
                }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });
            };
            return {
                folio: orderUUID,
                external_id: preference.id,
                receiver_address: args.orderRequest.address,
                payment_method: "mercado_pago",
                resume: orderResume,
            };
        });
    };

    async getOrders({ customerUUID, query: { limit, page, orderBy } }: { customerUUID: string, query: GetOrdersQuery }): Promise<GetOrders> {
        if (limit > 15) throw new BadRequestException("El limite máximo permitido es 15 registros")
        return await this.cacheService.remember<GetOrders>({
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
        return await this.cacheService.remember<GetOrderDetails>({
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

                const resume = this.orderUtilsService.calcOrderResume({ shoppingCart: orderItems });

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

    async getCheckoutOrder({ orderUUID }: { orderUUID: string }): Promise<CheckoutOrder> {
        return await this.cacheService.remember<CheckoutOrder>({
            method: "staleWhileRevalidate",
            entity: "customer:order:checkout",
            query: { orderUUID },
            fallback: async () => {
                const order = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID },
                    select: {
                        uuid: true,
                        external_order_id: true,
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

                const resume = this.orderUtilsService.calcOrderResume({ shoppingCart: orderItems });

                const checkoutOrder: CheckoutOrder = {
                    uuid: order.uuid,
                    address: order.customer_address,
                    items: orderItems,
                    external_id: order.external_order_id,
                    resume
                };

                return checkoutOrder;
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



};
