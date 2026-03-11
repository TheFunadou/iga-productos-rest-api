import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { AddItemsToOrder, CreateOrder, OrderValidatedCustomerData, ValidateCustomer } from "src/orders/order.dto";
import { buildValidatedCustomerData } from "src/orders/helpers/mercadopago.helpers";
import { OrderUtilsService } from "src/orders/order.utils.service";
import { OrderShoppingCartDTO } from "src/orders/payment/payment.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductVersionFindService } from "src/product-version/product-version.find.service";
import { ProductVersionCard } from "src/product-version/product-version.dto";

@Injectable()
export class CreateOrderService {
    private readonly logger = new Logger(CreateOrderService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly productVersionFind: ProductVersionFindService,
        private readonly orderUtils: OrderUtilsService
    ) { };


    async validateCustomer(args: ValidateCustomer): Promise<OrderValidatedCustomerData> {
        const { customer: { addressUUID, customerUUID }, guestForm } = args;
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

        const validatedCustomer = buildValidatedCustomerData({ customerAddressData, customerData, guestForm });
        if (!validatedCustomer) throw new BadRequestException("Ocurrio un error al crear al orden de pago");
        return validatedCustomer;
    };

    async buildShoppingCart({ orderItems, couponCode }: { orderItems: OrderShoppingCartDTO[], couponCode?: string }) {
        const skuList = orderItems.map((item) => item.product);
        const pvCards = await this.productVersionFind.searchCards({ filters: { skuList, couponCode }, scope: "internal" }).catch((error) => {
            this.logger.error(error);
            throw new BadRequestException("Error al crear orden de pago")
        });
        if (!pvCards) throw new BadRequestException("Error al obtener las tarjetas de producto")
        const { data } = pvCards;
        const shoppingCart = this.orderUtils.buildShoppingCart({ productVersionCards: data, orderItems });
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
        const orderResume = this.orderUtils.calcOrderResume({ shoppingCart });
        return orderResume;
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
        const orderItems = await this.orderUtils.buildAddItemsToOrder({ pvCards, shoppingCart, orderId });
        for (const data of orderItems) {
            await tx.orderItemsDetails.create({ data })
        };
    };

};