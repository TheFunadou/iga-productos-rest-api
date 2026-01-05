import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from "mercadopago";
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPayment: Payment;

    constructor(
        private readonly cacheService: CacheService,
        @InjectQueue("payment-processing") private readonly paymentQueue: Queue,
    ) {
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: this.mercadoPagoAccessToken! });
        this.mercadoPagoPayment = new Payment(this.mercadoPagoClient);
    };

    async getMercadoPagoPaymentInfo(args: { orderId: string }) {
        return await this.mercadoPagoPayment.get({ id: args.orderId }).catch((error) => {
            throw new BadRequestException("Error al obtener la información de la orden de pago");
        });
    };

    /**
     * Agrega un trabajo a la cola de procesamiento de pagos
     * @param args { paymentId: string }
     */
    async queuePaymentProcessing(args: { paymentId: string }): Promise<void> {
        const jobData: ProcessPaymentJob = {
            paymentId: args.paymentId,
            externalOrderId: args.paymentId,
            timestamp: new Date().toISOString(),
        };

        await this.paymentQueue.add("process-payment", jobData, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 }
        });

        this.logger.log(`Payment processing job queued for paymentId: ${args.paymentId}`);
    };

    /**
     * Obtiene el estado de la orden de pago
     * @param args { externalOrderId: string }
     */
    async getOrderProcessingStatus(args: { externalOrderId: string }): Promise<OrderProcessingStatus | null> {
        try {
            const status = await this.cacheService.getData<OrderProcessingStatus>({
                entity: "payment:status",
                query: { externalOrderId: args.externalOrderId }
            });

            return status || null;
        } catch (error) {
            this.logger.error(`Error al obtener el estado de la orden de pago: ${args.externalOrderId}, ${error}`);
            return null;
        }
    };

    async getOrderStatusByUUID(args: { orderUUID: string }): Promise<OrderProcessingStatus | null> {
        try {
            const status = await this.cacheService.getData<OrderProcessingStatus>({
                entity: "payment:status:uuid",
                query: { orderUUID: args.orderUUID }
            });

            return status || null;
        } catch (error) {
            this.logger.error(`Error al obtener el estado de la orden de pago: ${args.orderUUID}, ${error}`);
            return null;
        }
    }


};
