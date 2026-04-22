import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderPipeline } from "../pipeline/pipeline";
import { OrderContext } from "../pipeline/order.context";
import { CreatedOrder } from "src/orders/payment/application/DTO/order.dto";
import { CreateOrderCommand } from "../commands/create-order.command";

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {

    constructor(
        private readonly prisma: PrismaService,
        private readonly pipeline: OrderPipeline
    ) { }

    async execute(command: CreateOrderCommand): Promise<CreatedOrder> {

        return await this.prisma.$transaction(async (tx) => {
            const context: OrderContext = {
                orderUUID: crypto.randomUUID().toString(),
                isGuest: !command.customerUUID,
                customerUUID: command.customerUUID,
                addressUUID: command.addressUUID,
                sessionId: command.sessionId,
                guestForm: command.guestForm,
                couponCode: command.couponCode,
                buyNowItem: command.buyNowItem,
                frontendUrl: command.frontendUrl,
                notificationUrl: command.notificationUrl,
                paymentProvider: command.paymentProvider,
                tx
            };

            await this.pipeline.execute(context);
            return {
                orderUUID: context.orderUUID,
                paymentProvider: context.paymentProvider,
            };
        });
    }
}