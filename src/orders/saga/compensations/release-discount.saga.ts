import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderContext } from "src/orders/applications/pipeline/order.context";
import { SagaStep } from "src/orders/applications/pipeline/interfaces/saga-step.interface";

@Injectable()
export class ReleaseDiscountSaga implements SagaStep {
    constructor(private readonly prisma: PrismaService) { }

    async compensate(context: OrderContext): Promise<void> {
        // Si no se reservó ningún uso, no hay nada que revertir
        if (!context.reservedOfferUsages?.length) return;

        for (const { offerId, incrementedBy } of context.reservedOfferUsages) {
            await this.prisma.offers.update({
                where: { id: offerId },
                data: { current_uses: { decrement: incrementedBy } }
            });
        }
    }
}
