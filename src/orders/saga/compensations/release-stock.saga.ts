import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { OrderContext } from "src/orders/applications/pipeline/order.context";
import { SagaStep } from "src/orders/applications/pipeline/interfaces/saga-step.interface";

@Injectable()
export class ReleaseStockSaga implements SagaStep {
    constructor(private readonly prisma: PrismaService) { }

    async compensate(context: OrderContext) {
        for (const item of context.orderShoppingCart!) {
            await this.prisma.productVersion.update({
                where: { sku: item.sku },
                data: { stock: { increment: item.quantity } },
            });
        }
    }
}