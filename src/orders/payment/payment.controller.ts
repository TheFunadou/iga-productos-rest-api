import { Controller, Post, Query, Headers, Get, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CacheService } from 'src/cache/cache.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GetPaidOrderDetails } from './payment.dto';
import { OrderAndPaymentStatus } from '@prisma/client';
import { CommandBus } from '@nestjs/cqrs';
import { OrderProcessingStatus } from './payment.interfaces';
// import { MercadoPagoProcessWebhookCommand } from './domain/commands/mercadopago-proccess-webhook/process-webhook.command';

@Controller('payment')
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
    ) { };
    @Post("mercadopago/webhook")
    async handleMercadoPagoWebhookV2(
        @Query("data.id") dataId: string,
        @Query('type') type: string,
        @Headers('x-signature') xSignature: string,
        @Headers('x-request-id') xRequestId: string,
    ) {
        await this.paymentService.processMercadoPagoWebhook({
            xSignature,
            xRequestId,
            dataId,
            type
        });

        return { success: true };
    };


    @Get('status/:externalOrderId')
    @ApiOperation({ summary: "Obtiene el estado de procesamiento de un pago por ID externo" })
    @ApiParam({ name: 'externalOrderId', description: 'ID del pago en MercadoPago' })
    @ApiResponse({ status: 200, description: "Estado del procesamiento", type: Object })
    async getPaymentStatus(
        @Param('externalOrderId') externalOrderId: string
    ): Promise<OrderProcessingStatus> {
        const status = await this.paymentService.getOrderProcessingStatus({ externalOrderId });
        return status || {
            status: 'pending',
            updatedAt: new Date().toISOString(),
        };
    };

    @Get("order/status/:uuid")
    @ApiOperation({ summary: "Obtiene el estado de una orden por UUID" })
    @ApiParam({ name: 'uuid', description: 'UUID de la orden' })
    @ApiResponse({ status: 200, description: "Estado de la orden", type: Object })
    async getOrderStatusWithDetails(
        @Param('uuid') uuid: string,
        @Query("status") requiredStatus: OrderAndPaymentStatus[]
    ): Promise<GetPaidOrderDetails> {
        const status = await this.paymentService.getOrderStatusWithDetails({ orderUUID: uuid, requiredStatus: Array.isArray(requiredStatus) ? requiredStatus : [requiredStatus] });
        return status;
    };

};
