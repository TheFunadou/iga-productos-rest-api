import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { AddItemsToOrder, AddItemsToOrderOrderItems, CreateOrder, OrderRequestFormGuestDTO, OrderValidatedCustomerData, ValidateCustomer } from "src/orders/order.dto";
import { OrderShoppingCartDTO } from "src/orders/payment/payment.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductVersionFindService } from "src/product-version/product-version.find.service";
import { CacheService } from "src/cache/cache.service";
import { buildShoppingCart, buildValidatedAuthCustomerData, buildValidatedGuestCustomerData, calcShoppingCartOrderResume } from "src/orders/orders.helpers";
import { ProductVersionCard } from "src/product-version/product-version.dto";

@Injectable()
export class CreateOrderService {
    private readonly logger = new Logger(CreateOrderService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly productVersionFind: ProductVersionFindService,
        private readonly cache: CacheService
    ) { };


    async validateCustomer(args: ValidateCustomer): Promise<OrderValidatedCustomerData> {
        const { customer: { addressUUID, customerUUID }, guestForm, isGuest, orderUUID } = args;
        if (isGuest) {
            if (!guestForm) throw new BadRequestException("Error al crear orden de pago, no se encontro el formulario del invitado.")
            await this.cache.setData<OrderRequestFormGuestDTO>({
                entity: "order:guest:data",
                query: { orderUUID },
                data: guestForm,
                aditionalOptions: {
                    ttlMilliseconds: 1000 * 60 * 15
                },
            });
            return buildValidatedGuestCustomerData({ guestForm });;
        };
        if (!customerUUID || !addressUUID) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        const customerData = await this.prisma.customer.findUnique({
            where: { uuid: customerUUID },
            select: {
                id: true, name: true,
                last_name: true, email: true
            }
        });
        const customerAddressData = await this.prisma.customerAddresses.findUnique({
            where: { uuid: addressUUID },
            select: {
                id: true, zip_code: true,
                street_name: true, city: true,
                state: true, number: true,
                country: true
            }
        });
        if (!customerData || !customerAddressData) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        return buildValidatedAuthCustomerData({ customerAddressData, customerData });
    };

    async buildShoppingCart({ orderItems, couponCode }: { orderItems: OrderShoppingCartDTO[], couponCode?: string }) {
        const skuList = orderItems.map((item) => item.product);
        const pvCards = await this.productVersionFind.searchCards({ filters: { skuList, couponCode }, scope: "internal" }).catch((error) => {
            this.logger.error(error);
            throw new BadRequestException("Error al crear orden de pago")
        });
        if (!pvCards) throw new BadRequestException("Error al obtener las tarjetas de producto")
        const { data } = pvCards;
        const shoppingCart = buildShoppingCart({ productVersionCards: data, orderItems });
        return { pvCards: data, shoppingCart };
    };

    async validateShoppingCartStock({ tx, shoppingCart }: { tx: Prisma.TransactionClient, shoppingCart: ShoppingCartDTO[] }) {
        for (const item of shoppingCart) {
            const productVersion = await tx.productVersion.findUnique({
                where: { sku: item.product_version.sku },
                select: { stock: true }
            });
            if (!productVersion) throw new NotFoundException("Producto no encontrado");
            if (productVersion.stock < item.quantity) throw new BadRequestException("Stock insuficiente para realizar este compra");
        }
    };

    async reserveStock({ tx, shoppingCart }: { tx: Prisma.TransactionClient, shoppingCart: ShoppingCartDTO[] }) {
        for (const item of shoppingCart) {
            await tx.productVersion.update({
                where: { sku: item.product_version.sku },
                data: { stock: { decrement: item.quantity } }
            })
        }
    };

    async calcOrderResume({ shoppingCart }: { shoppingCart: ShoppingCartDTO[] }) {
        const orderResume = calcShoppingCartOrderResume({ shoppingCart });
        return orderResume;
    };

    private async buildAddItemsToOrder(args: {
        pvCards: ProductVersionCard[],
        shoppingCart: ShoppingCartDTO[],
        orderId: string,
    }): Promise<AddItemsToOrderOrderItems[]> {
        const { pvCards, shoppingCart, orderId } = args;
        const orderItems: AddItemsToOrderOrderItems[] = [];
        for (const item of pvCards) {
            const shoppingCartItem = shoppingCart.find((cart) => cart.product_version.sku === item.product_version.sku);
            if (shoppingCartItem) {
                const findItem = await this.prisma.productVersion.findUnique({ where: { sku: shoppingCartItem.product_version.sku }, select: { id: true } });
                if (!findItem) throw new NotFoundException("Ocurrio un error al procesar la orden de pago");
                orderItems.push({
                    order_id: orderId,
                    product_version_id: findItem.id,
                    quantity: shoppingCartItem.quantity,
                    unit_price: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) : parseFloat(item.product_version.unit_price!.toString()),
                    discount: shoppingCartItem.discount,
                    subtotal: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) * shoppingCartItem.quantity : parseFloat(item.product_version.unit_price!.toString()) * shoppingCartItem.quantity,
                });
            }
        }
        return orderItems;
    };


    async create(args: CreateOrder, isGuestOrder: boolean) {
        const { tx, uuid, externalId, customerAddressId, customerId, paymentProvider, totalAmount, exchange } = args;
        const { id } = await tx.order.create({
            data: {
                uuid,
                external_order_id: externalId,
                customer_address_id: customerAddressId,
                customer_id: customerId,
                payment_provider: paymentProvider,
                status: "IN_PROCESS",
                total_amount: totalAmount,
                exchange,
                is_guest_order: isGuestOrder
            },
            select: { id: true }
        });
        return id;
    };

    async addItemsToOrder(args: AddItemsToOrder) {
        const { tx, pvCards, shoppingCart, orderId } = args;
        const orderItems = await this.buildAddItemsToOrder({ pvCards, shoppingCart, orderId });
        for (const data of orderItems) {
            await tx.orderItemsDetails.create({ data })
        };
    };

};