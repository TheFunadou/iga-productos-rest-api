import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/cache/cache.service";
import { ShippingService } from "src/shipping/shipping.service";
import { ShoppingCartService } from "src/customer/shopping-cart/shopping-cart.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { MercadoPagoPaymentContext } from "../../pipeline/mercadopago-pipelines/payment-context";
import { MercadoPagoPipeline } from "../../pipeline/mercadopago-pipelines/pipeline.interface";
import { FetchPaymentDetailsStep } from "../../pipeline/mercadopago-pipelines/post-queue/fetch-payment-details.step";
import { UpdateOrderStatusStep } from "../../pipeline/mercadopago-pipelines/post-queue/update-order-status.step";
import { RestoreStockStep } from "../../pipeline/mercadopago-pipelines/post-queue/restore-stock.step";
import { CreateShippingStep } from "../../pipeline/mercadopago-pipelines/post-queue/create-shipping.step";
import { SendNotificationStep } from "../../pipeline/mercadopago-pipelines/post-queue/send-notification.step";
import { InvalidateCacheStep } from "../../pipeline/mercadopago-pipelines/post-queue/invalidate-cache.step";
import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";
import { OrderProcessingStatus, ProcessPaymentJob } from "src/orders/payment/payment.interfaces";
import { PaymentService } from "src/orders/payment/payment.service";

@Processor("payment-processor", { concurrency: 5 })
export class MercadoPagoPaymentQueueConsumer extends WorkerHost {
    private readonly logger = new Logger(MercadoPagoPaymentQueueConsumer.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly shipping: ShippingService,
        private readonly shoppingCart: ShoppingCartService,
        private readonly notifications: NotificationsService,
        private readonly mercadopago: MercadoPagoProvider,
        private readonly paymentService: PaymentService
    ) { super(); }

    async process(job: Job<ProcessPaymentJob>): Promise<void> {
        this.logger.log(`Iniciando procesamiento del job ${job.id} para pago ${job.data.paymentId}`);
        const context = new MercadoPagoPaymentContext({ paymentId: job.data.paymentId, nodeEnv: job.data.nodeEnv });
        context.conditionalLog(`Iniciando worker para el job ${job.id} para pago ${job.data.paymentId}`);
        try {
            await new MercadoPagoPipeline<MercadoPagoPaymentContext>()
                .pipe(new FetchPaymentDetailsStep(this.mercadopago))
                .pipe(new UpdateOrderStatusStep(this.prisma))
                .pipe(new RestoreStockStep(this.prisma))
                .pipe(new CreateShippingStep(this.shipping))
                .pipe(new SendNotificationStep(this.notifications, this.paymentService))
                .pipe(new InvalidateCacheStep(this.cache, this.shoppingCart))
                .run(context);

            context.conditionalLog("Proceso de pago completado con éxito");
        } catch (error) {
            this.logger.error(`Error critico procesando job ${job.id}:`, error);
            // Solo marcar como "failed" en el último intento para no confundir con reintentos normales
            const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
            if (isLastAttempt) {
                await this.cache.setData<OrderProcessingStatus>({
                    entity: "payment:status",
                    query: { externalOrderId: job.data.paymentId },
                    data: {
                        status: "failed",
                        updatedAt: new Date().toISOString(),
                        error: error instanceof Error ? error.message : "unknown error"
                    },
                    aditionalOptions: { ttlMilliseconds: 1000 * 60 * 60 }
                });
            }
            throw error; // siempre relanzar para que BullMQ gestione los reintentos
        }
    }


    @OnWorkerEvent("completed")
    onCompleted(job: Job<ProcessPaymentJob>) {
        this.logger.log(`Job ${job.id} completado exitosamente`);
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job<ProcessPaymentJob>, error: Error) {
        this.logger.error(`Job ${job.id} falló: ${error.message}`);
    }

    @OnWorkerEvent("active")
    onActive(job: Job<ProcessPaymentJob>) {
        this.logger.log(`Job ${job.id} activo`);
    }
}
