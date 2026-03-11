import { IStep } from "../pipeline.interface";
import { MercadoPagoWebhookContext } from "../webhook-context";

export class FilterEventTypeStep implements IStep<MercadoPagoWebhookContext> {
    async execute(context: MercadoPagoWebhookContext): Promise<void> {
        if (context.type !== "payment") context.shouldStop = true;
    }
}