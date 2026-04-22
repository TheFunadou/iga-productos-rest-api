import { Controller, Post, Query, Headers, Get, Param, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { OrderProcessingStatus } from './payment.interfaces';
import { PaymentDetailsI } from './application/interfaces/payment.interfaces';
import { GetPaymentDetailsQueryDTO } from './payment.dto';
import { OptionalCustomerAuthGuard } from 'src/customer_auth/customer_auth.optional.guard';
import { OptionalCustomer } from 'src/customer_auth/customer_auth.optional.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';

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


    @Get("order/details/:uuid")
    @UseGuards(OptionalCustomerAuthGuard)
    @ApiOperation({ summary: "Obtiene el estado de una orden por UUID" })
    @ApiParam({ name: 'uuid', description: 'UUID de la orden' })
    @ApiResponse({ status: 200, description: "Estado de la orden", type: Object })
    async getOrderDetails(
        @OptionalCustomer() customer: CustomerPayload,
        @Param('uuid') uuid: string,
        @Query() query: GetPaymentDetailsQueryDTO
    ): Promise<PaymentDetailsI> {
        return await this.paymentService.getDetails({ orderUUID: uuid, query, customerUUID: customer?.uuid });
    };

};
