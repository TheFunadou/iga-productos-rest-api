import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentOrderDTO } from './payment/payment.dto';
import { GuestOrderData, OrderRequestDTO, OrderRequestGuestDTO } from './order.dto';
import { ProductVersionFindService } from 'src/product-version/product-version.find.service';
import { OrderUtilsService } from './order.utils.service';
import { MercadoPagoConfig, Preference as MercadoPagoPreference, Preference } from "mercadopago";

@Injectable()
export class OrdersService {

    private readonly mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPreference: MercadoPagoPreference;

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly productVersionFindService: ProductVersionFindService,
        private readonly orderUtilsService: OrderUtilsService
    ) {
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: this.mercadoPagoAccessToken! });
        this.mercadoPagoPreference = new Preference(this.mercadoPagoClient);
    };



    async createMercadoPagoOrderAuthCustomer(args: { orderRequest: OrderRequestDTO, customerUUID: string }): Promise<PaymentOrderDTO> {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID } });
            if (!customer) throw new NotFoundException("Error inesperado al crear la orden, no se encontro al cliente");
            const customerAddress = await tx.customerAddresses.findUnique({ where: { uuid: args.orderRequest.address } });
            if (!customerAddress) throw new NotFoundException("Error inesperado al crear la orden, no se encontro la dirección de envio");
            const itemsSKUList = args.orderRequest.shopping_cart.map((item) => item.product);
            const itemCards = await this.productVersionFindService.searchCardsBySKUList({ tx, skuList: itemsSKUList, customerUUID: args.customerUUID });
            const items = this.orderUtilsService.buildMercadoPagoOrderItems({ items: itemCards, shoppingCart: args.orderRequest.shopping_cart });
            const vigency = this.orderUtilsService.buildMercadoPagoPaymentVigency();
            const shoppingCart = this.orderUtilsService.buildShoppingCart({ productVersionCards: itemCards, orderRequest: args.orderRequest });
            const orderUUID = crypto.randomUUID().toString();
            const body = this.orderUtilsService.buildMercadoPagoPreferenceBodyAuthCustomer({
                internalOrderId: orderUUID, items, shoppingCart, vigency, customer, customerAddress,
            });
            const preference = await this.mercadoPagoPreference.create(body);
            const totalAmount = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
            if (!preference.id) throw new BadRequestException("Error al crear la orden de pago");
            const order = await tx.order.create({
                data: {
                    uuid: orderUUID,
                    external_order_id: preference.id,
                    customer_address_id: customerAddress.id,
                    customer_id: customer.id,
                    payment_provider: "mercado_pago",
                    status: "in_process",
                    total_amount: totalAmount,
                    exchange: "MXN",
                },
            }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });

            for (const item of items) {
                await tx.orderItemsDetails.create({
                    data: {
                        order_id: order.id,
                        product_version_id: item.id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        subtotal: item.unit_price * item.quantity,
                    },
                }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });
            };
            return {
                folio: orderUUID,
                items: shoppingCart,
                order_id: preference.id,
                receiver_address: customerAddress,
                payment_method: "mercado_pago",
            };

        });
    };

    async createMercadoPagoOrderGuest(args: { orderRequest: OrderRequestGuestDTO }): Promise<PaymentOrderDTO> {
        return await this.prisma.$transaction(async (tx) => {
            const itemsSKUList = args.orderRequest.shopping_cart.map((item) => item.product);
            const itemCards = await this.productVersionFindService.searchCardsBySKUList({ tx, skuList: itemsSKUList });
            const items = this.orderUtilsService.buildMercadoPagoOrderItems({ items: itemCards, shoppingCart: args.orderRequest.shopping_cart });
            const vigency = this.orderUtilsService.buildMercadoPagoPaymentVigency();
            const shoppingCart = this.orderUtilsService.buildShoppingCart({ productVersionCards: itemCards, orderRequest: args.orderRequest });
            const orderUUID = crypto.randomUUID().toString();
            const body = this.orderUtilsService.buildMercadoPagoPreferenceBodyAuthCustomer({
                internalOrderId: orderUUID, items, shoppingCart, vigency, customer: args.orderRequest.guest, customerAddress: args.orderRequest.address,
            });
            const preference = await this.mercadoPagoPreference.create(body);
            const totalAmount = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
            if (!preference.id) throw new BadRequestException("Error al crear la orden de pago");
            const order = await tx.order.create({
                data: {
                    uuid: orderUUID,
                    external_order_id: preference.id,
                    payment_provider: "mercado_pago",
                    is_guest_order: true,
                    status: "in_process",
                    total_amount: totalAmount,
                    exchange: "MXN",
                },
            }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });

            await this.cacheService.setData<GuestOrderData>({
                entity: "order:customer_data",
                query: { orderUUID },
                data: {
                    customer: args.orderRequest.guest,
                    address: args.orderRequest.address,
                    createdAt: new Date().toISOString(),
                }
            }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });

            for (const item of items) {
                await tx.orderItemsDetails.create({
                    data: {
                        order_id: order.id,
                        product_version_id: item.id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        subtotal: item.unit_price * item.quantity,
                    },
                }).catch((error) => { throw new BadRequestException("Error al crear la orden de pago") });
            };
            return {
                folio: orderUUID,
                items: shoppingCart,
                order_id: preference.id,
                receiver_address: args.orderRequest.address,
                payment_method: "mercado_pago",
            };
        });
    };

};
