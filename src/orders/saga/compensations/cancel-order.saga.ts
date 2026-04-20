import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { SagaStep } from "src/orders/applications/pipeline/interfaces/saga-step.interface";
import { OrderContext } from "src/orders/applications/pipeline/order.context";

@Injectable()
export class CancelOrderSaga implements SagaStep {
    constructor(private readonly prisma: PrismaService) { }

    async compensate(context: OrderContext) {
        if (context.orderId) {
            await this.prisma.order.update({
                where: { id: context.orderId },
                data: { status: "CANCELLED" },
            });
        }
    }
}