import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderPipeline } from "../pipeline/pipeline-v2";
import { OrderContext } from "../pipeline/order.context-v2";
import { CreatedOrder } from "src/orders/order.dto";
import { CreateOrderCommand } from "../commands/create-order-v2.command";

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