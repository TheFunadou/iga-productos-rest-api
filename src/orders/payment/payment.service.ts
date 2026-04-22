import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { GetPaymentDetailsQueryDTO, MercadoPagoWebhook } from './payment.dto';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { MercadoPagoProcessWebhookCommand } from './domain/commands/mercadopago-proccess-webhook/process-webhook.command';
import { OrderProcessingStatus } from './payment.interfaces';
import { GetPaymentDetailsService } from './services/get-payment-details.service';
import { PaymentDetailsI } from './application/interfaces/payment.interfaces';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly nodeEnv: string;

    constructor(
        private readonly cacheService: CacheService,
        private readonly config: ConfigService,
        private readonly commandBus: CommandBus,
        private readonly getPaymentDetails: GetPaymentDetailsService

    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async processMercadoPagoWebhook(args: MercadoPagoWebhook) {
        const { xSignature, xRequestId, dataId, type } = args;
        await this.commandBus.execute(
            new MercadoPagoProcessWebhookCommand(
                xSignature,
                xRequestId,
                dataId,
                type,
                this.nodeEnv
            )
        );
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
        const status = await this.cacheService.getData<OrderProcessingStatus>({
            entity: "payment:status:uuid",
            query: { orderUUID: args.orderUUID }
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(`Error al obtener el status del la orden, ${error}`);
            this.logger.error("Error al obtener el status del la orden");
            throw new BadRequestException("Error al obtener el status de la orden");
        });
        return status || null;
    };

    async getDetails(args: { orderUUID: string, query: GetPaymentDetailsQueryDTO, customerUUID?: string }): Promise<PaymentDetailsI> {
        const { orderUUID, query, customerUUID } = args;
        return await this.getPaymentDetails.executeV2({ orderUUID, query, customerUUID });
    };


};
