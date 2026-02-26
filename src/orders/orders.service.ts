import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderItems, OrderReadyToPay } from './payment/payment.dto';
import { GetOrders, GetOrdersQuery, GuestOrderData, CheckoutOrder, OrderRequestDTO, OrderRequestGuestDTO, GetOrderDetails, OrdersDashboardParams, GetOrdersDashboard, SafeOrder } from './order.dto';
import { ProductVersionFindService } from 'src/product-version/product-version.find.service';
import { OrderUtilsService } from './order.utils.service';
import { MercadoPagoConfig, Preference as MercadoPagoPreference, Preference } from "mercadopago";
import { ShoppingCartDTO } from 'src/customer/shopping-cart/shopping-cart.dto';
import { OrderAndPaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(OrdersService.name);
    private readonly mercadoPagoAccessToken?: string;
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPreference: MercadoPagoPreference;

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly productVersionFind: ProductVersionFindService,
        private readonly orderUtils: OrderUtilsService,
        private readonly config: ConfigService
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
        this.mercadoPagoAccessToken = this.nodeEnv === "production"
            ? this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN")
            : this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN_TEST");

        if (!this.mercadoPagoAccessToken) {
            if (this.nodeEnv === "DEV") this.logger.error("Variable de entorno MERCADO_PAGO_ACCESS_TOKEN / ..._TEST vacia o no configurada ");
            this.logger.error("Error en OrdersService.ts");
            throw new Error("Error al cargar modulo de Ordenes");
        };
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: this.mercadoPagoAccessToken });
        this.mercadoPagoPreference = new Preference(this.mercadoPagoClient);
    };

    async createMercadoPagoOrderAuthCustomer(args: { orderRequest: OrderRequestDTO, customerUUID: string }): Promise<OrderReadyToPay> {
        const customer = await this.prisma.customer.findUnique({ where: { uuid: args.customerUUID } });
        if (!customer) throw new NotFoundException("Error inesperado al crear la orden, no se encontro al cliente");
        const customerAddress = await this.prisma.customerAddresses.findUnique({ where: { uuid: args.orderRequest.address } });
        if (!customerAddress) throw new NotFoundException("Error inesperado al crear la orden, no se encontro la dirección de envio");
        const itemsSKUList = args.orderRequest.shopping_cart.map((item) => item.product);
        const itemCards = await this.productVersionFind.searchCardsBySKUList({ skuList: itemsSKUList, customerUUID: args.customerUUID, couponCode: args.orderRequest.coupon_code }).catch((error) => {
            throw new BadRequestException(`Error al obtener las tarjetas de prodcutos ${this.nodeEnv === "DEV" && `: ${error}`}`)
        });
        const items = this.orderUtils.buildMercadoPagoOrderItems({ items: itemCards, shoppingCart: args.orderRequest.shopping_cart });
        const vigency = this.orderUtils.buildMercadoPagoPaymentVigency();
        const shoppingCart = this.orderUtils.buildShoppingCart({ productVersionCards: itemCards, orderRequest: args.orderRequest });

        return await this.prisma.$transaction(async (tx) => {
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

            const orderResume = this.orderUtils.calcOrderResume({ shoppingCart });
            const orderUUID = crypto.randomUUID().toString();
            const body = this.orderUtils.buildMercadoPagoPreferenceBodyAuthCustomer({
                internalOrderId: orderUUID, items, shoppingCart, vigency, customer, customerAddress, shippingCost: orderResume.shippingCost,
            });
            const preference = await this.mercadoPagoPreference.create(body);
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
            });

            for (const item of items) {
                const productVersion = await tx.productVersion.findUnique({ where: { sku: item.id }, select: { id: true } });
                const shoppingCartItem = shoppingCart.find((cartItem) => cartItem.product_version.sku === item.id);
                if (!shoppingCartItem) throw new BadRequestException(`Error al crear la orden de pago 3 ${this.nodeEnv === "DEV" && `: No se encontro el item del carrito ${item.id}`}`);
                if (!productVersion) throw new BadRequestException(`Error al crear la orden de pago 3 ${this.nodeEnv === "DEV" && `: No se encontro la version del producto ${item.id}`}`);
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
            const response: OrderReadyToPay = {
                folio: orderUUID,
                external_id: preference.id,
                payment_method: "mercado_pago"
            }
            return response;
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al crear orden de pago");
            throw new BadRequestException("Error al crear orden de pago");
        });
    };

    async createMercadoPagoOrderGuest(args: { orderRequest: OrderRequestGuestDTO }): Promise<OrderReadyToPay> {
        return await this.prisma.$transaction(async (tx) => {
            const itemsSKUList = args.orderRequest.shopping_cart.map((item) => item.product);
            const itemCards = await this.productVersionFind.searchCardsBySKUList({ tx, skuList: itemsSKUList });
            const items = this.orderUtils.buildMercadoPagoOrderItems({ items: itemCards, shoppingCart: args.orderRequest.shopping_cart });
            const vigency = this.orderUtils.buildMercadoPagoPaymentVigency();
            const shoppingCart = this.orderUtils.buildShoppingCart({ productVersionCards: itemCards, orderRequest: args.orderRequest });

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
            const orderResume = this.orderUtils.calcOrderResume({ shoppingCart });
            const body = this.orderUtils.buildMercadoPagoPreferenceBodyAuthCustomer({
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

            await this.cache.setData<GuestOrderData>({
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
                if (!productVersion) throw new BadRequestException(`Error al crear la orden de pago 3 ${this.nodeEnv === "DEV" && `: No se encontro la version del producto ${item.id}`}`);
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

                const resume = this.orderUtils.calcOrderResume({ shoppingCart: orderItems });

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

                const resume = this.orderUtils.calcOrderResume({ shoppingCart: orderItems });

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
