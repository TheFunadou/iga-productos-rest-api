import { CacheService } from "src/cache/cache.service";
import { IStep } from "../pipeline.interface";
import { MercadoPagoWebhookContext } from "../webhook-context";
import { OrderProcessingStatus } from "src/orders/payment/payment.interfaces";

export class InitProcessingStatusStep implements IStep<MercadoPagoWebhookContext> {
    constructor(private readonly cache: CacheService) { };

    async execute(context: MercadoPagoWebhookContext): Promise<void> {
        if (context.shouldStop) return;
        if (!context.dataId) {
            context.shouldStop = true;
            return;
        }

        await this.cache.setData<OrderProcessingStatus>({
            entity: "payment:status",
            query: { externalOrderId: context.dataId },
            data: {
                status: "processing",
                updatedAt: new Date().toISOString()
            },
            aditionalOptions: { ttlMilliseconds: 1000 * 60 * 60 }
        })
    }
}