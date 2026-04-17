import { SagaStep } from "src/orders/applications/pipeline/interfaces/saga-step.interface";
import { OrderContext } from "src/orders/applications/pipeline/order.context";
import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ReleaseStockSaga implements SagaStep {
    constructor(private readonly prisma: PrismaService) { }

    async compensate(context: OrderContext) {
        for (const item of context.shoppingCart!) {
            await this.prisma.productVersion.update({
                where: { sku: item.product_version.sku },
                data: { stock: { increment: item.quantity } },
            });
        }
    }
}