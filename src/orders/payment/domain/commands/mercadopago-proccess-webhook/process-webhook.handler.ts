import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { MercadoPagoProcessWebhookCommand } from "./process-webhook.command";
import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";
import { CacheService } from "src/cache/cache.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MercadoPagoWebhookContext } from "../../pipeline/mercadopago-pipelines/webhook-context";
import { MercadoPagoPipeline } from "../../pipeline/mercadopago-pipelines/pipeline.interface";
import { VerifySignatureStep } from "../../pipeline/mercadopago-pipelines/pre-queue/verify-signature.step";
import { FilterEventTypeStep } from "../../pipeline/mercadopago-pipelines/pre-queue/filter-event-type.step";
import { InitProcessingStatusStep } from "../../pipeline/mercadopago-pipelines/pre-queue/init-processing-status.step";


@CommandHandler(MercadoPagoProcessWebhookCommand)
export class MercadoPagoProcessWebhookHandler implements ICommandHandler<MercadoPagoProcessWebhookCommand> {
    constructor(
        private readonly mercadopago: MercadoPagoProvider,
        private readonly cache: CacheService,
        @InjectQueue("mercadopago-payment-processing") private readonly queue: Queue
    ) { };

    async execute(command: MercadoPagoProcessWebhookCommand): Promise<any> {
        const context = new MercadoPagoWebhookContext({
            ...command, nodeEnv: command.nodeEnv
        });
        context.conditionalLog(`Iniciando procesamiento de webhook para el pago ${context.dataId}`);
        await new MercadoPagoPipeline<MercadoPagoWebhookContext>()
            .pipe(new VerifySignatureStep(this.mercadopago, command.nodeEnv))
            .pipe(new FilterEventTypeStep())
            .pipe(new InitProcessingStatusStep(this.cache))
            .run(context);

        if (context.shouldStop) {
            context.conditionalLog("Webhook filtrado o no requiere accion");
            return;
        };

        context.conditionalLog(`Agregando pago ${context.dataId} a la cola de procesamiento`);

        await this.queue.add("mercadopago-process-payment", {
            paymentId: context.dataId,
            nodeEnv: command.nodeEnv,
            timestamp: new Date().toISOString(),
        }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
        });
    };
};