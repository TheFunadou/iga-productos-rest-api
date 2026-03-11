import { BadRequestException, Logger } from "@nestjs/common";
import { CreateOrderCommand } from "./create-order.command";
import { CreateOrderService } from "../../services/create-order.service";
import { CreateOrderStrategyFactory } from "../../factories/create-order.factory";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderReadyToPay } from "src/orders/payment/payment.dto";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
    private readonly logger = new Logger(CreateOrderHandler.name);
    constructor(
        private readonly createOrder: CreateOrderService,
        private readonly createOrderFactory: CreateOrderStrategyFactory,
        private readonly prisma: PrismaService,
    ) { };

    async execute(command: CreateOrderCommand) {
        const { orderItems, paymentProvider, customerUUID, addressUUID, couponCode, guestForm, frontendUrl, notificationUrl } = command;
        const { customer, customerAddress } = await this.createOrder.validateCustomer({ customer: { customerUUID, addressUUID }, guestForm });
        const { shoppingCart, pvCards } = await this.createOrder.buildShoppingCart({ orderItems, couponCode });
        const orderResume = await this.createOrder.calcOrderResume({ shoppingCart });
        const createOrderStrategy = this.createOrderFactory.create(paymentProvider);
        const { externalID, orderUUID } = await createOrderStrategy.createOrder({
            customer: {
                email: customer.email,
                name: customer.name,
                last_name: customer.last_name
            },
            customerAddress,
            frontendUrl,
            notificationUrl,
            orderItems,
            pvCards,
            shippingCost: orderResume.shippingCost
        });
        const created: OrderReadyToPay = await this.prisma.$transaction(async (tx) => {
            await this.createOrder.validateShoppingCartStock({ tx, shoppingCart });
            await this.createOrder.reserveStock({ tx, shoppingCart });
            const isGuest = !customerUUID ? true : false;
            const orderId = await this.createOrder.create({
                tx,
                uuid: orderUUID,
                externalId: externalID,
                customerAddressId: customerAddress.id,
                customerId: customer.id,
                paymentProvider,
                totalAmount: orderResume.total,
                exchange: "MXN",
            }, isGuest);
            await this.createOrder.addItemsToOrder({
                tx,
                orderId,
                pvCards,
                shoppingCart
            });
            const response: OrderReadyToPay = {
                folio: orderUUID,
                external_id: externalID,
                payment_method: paymentProvider
            };
            return response;
        }).catch((error) => {
            this.logger.error(error);
            throw new BadRequestException("Ocurrio un problema al crear la orden");
        });

        return created;

    };
};