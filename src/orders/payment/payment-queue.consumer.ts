import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { PaymentProcessorService } from "./payment-processor.service";
import { Job } from "bullmq";
import { ProcessPaymentJob } from "./payment.interfaces";

@Processor("payment-processing", {
    concurrency: 5
})
export class PaymentQueueConsumer extends WorkerHost {
    private readonly logger = new Logger(PaymentQueueConsumer.name);

    constructor(
        private readonly paymentProcessorService: PaymentProcessorService
    ) { super(); };

    async process(job: Job<ProcessPaymentJob>) {
        this.logger.log(`Processing job ${job.id} for payment ${job.data.paymentId}`);

        try {
            await this.paymentProcessorService.processMercadoPagoPayment({ paymentId: job.data.paymentId });
            this.logger.log(`Job ${job.id} for payment ${job.data.paymentId} completed successfully`);
        } catch (error) {
            this.logger.error(`Error processing job ${job.id} for payment ${job.data.paymentId}: ${error}`);
            throw error;
        };
    };

    @OnWorkerEvent('completed')
    onCompleted(job: Job<ProcessPaymentJob>) {
        this.logger.log(`Job ${job.id} has been completed`);
    };
    @OnWorkerEvent('failed')
    onFailed(job: Job<ProcessPaymentJob>, error: Error) {
        this.logger.error(`Job ${job.id} has failed with error: ${error.message}`);
    };
    @OnWorkerEvent('active')
    onActive(job: Job<ProcessPaymentJob>) {
        this.logger.log(`Job ${job.id} is now active`);
    };
};