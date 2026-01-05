import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { GuestOrderData, OrderRequestDTO, OrderRequestGuestDTO } from './order.dto';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { PaymentOrderDTO } from './payment/payment.dto';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
    ) { };

    @Post("mercadopago/authenticated")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Crea una orden de pago con Mercado Pago para un cliente autenticado" })
    @ApiResponse({ status: 200, description: "Orden de pago creada exitosamente", type: PaymentOrderDTO })
    @ApiResponse({ status: 400, description: "Error al crear la orden de pago" })
    @ApiResponse({ status: 401, description: "No se proporciono un token de autenticacion" })
    @ApiResponse({ status: 403, description: "No se proporciono un token CSRF valido" })
    @ApiResponse({ status: 404, description: "No se encontro al cliente" })
    @ApiResponse({ status: 500, description: "Error inesperado al crear la orden de pago" })
    @ApiHeader({ name: "csrf-token", description: "Token CSRF" })
    @ApiBody({ type: OrderRequestDTO })
    async createMPAuthCustomer(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: OrderRequestDTO): Promise<PaymentOrderDTO> {
        return await this.ordersService.createMercadoPagoOrderAuthCustomer({ customerUUID: customer.uuid, orderRequest: dto });
    };

    @Post("mercadopago/guest")
    @ApiOperation({ summary: "Crea una orden de pago con Mercado Pago para un cliente invitado" })
    @ApiResponse({ status: 200, description: "Orden de pago creada exitosamente", type: PaymentOrderDTO })
    @ApiResponse({ status: 400, description: "Error al crear la orden de pago" })
    @ApiResponse({ status: 500, description: "Error inesperado al crear la orden de pago" })
    @ApiHeader({ name: "csrf-token", description: "Token CSRF" })
    @ApiBody({ type: OrderRequestGuestDTO })
    async createMPGuestCustomer(@Body() dto: OrderRequestGuestDTO): Promise<PaymentOrderDTO> {
        return await this.ordersService.createMercadoPagoOrderGuest({ orderRequest: dto });
    };
};
