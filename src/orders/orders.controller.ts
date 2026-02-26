import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { GetOrdersQuery, OrderRequestDTO, OrderRequestGuestDTO, OrdersDashboardParams, UpdateOrderStatusDTO } from './order.dto';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginationDTO } from 'src/common/DTO/pagination.dto';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { OrderAndPaymentStatus } from '@prisma/client';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
    ) { };


    @Post("mercadopago/authenticated")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Crea una orden de pago con Mercado Pago para un cliente autenticado" })
    @ApiResponse({ status: 200, description: "Orden de pago creada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al crear la orden de pago" })
    @ApiResponse({ status: 401, description: "No se proporciono un token de autenticacion" })
    @ApiResponse({ status: 403, description: "No se proporciono un token CSRF valido" })
    @ApiResponse({ status: 404, description: "No se encontro al cliente" })
    @ApiResponse({ status: 500, description: "Error inesperado al crear la orden de pago" })
    @ApiHeader({ name: "csrf-token", description: "Token CSRF" })
    @ApiBody({ type: OrderRequestDTO })
    async createMPAuthCustomer(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: OrderRequestDTO) {
        return await this.ordersService.createMercadoPagoOrderAuthCustomer({ customerUUID: customer.uuid, orderRequest: dto });
    };

    @Post("mercadopago/guest")
    @ApiOperation({ summary: "Crea una orden de pago con Mercado Pago para un cliente invitado" })
    @ApiResponse({ status: 200, description: "Orden de pago creada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al crear la orden de pago" })
    @ApiResponse({ status: 500, description: "Error inesperado al crear la orden de pago" })
    @ApiHeader({ name: "csrf-token", description: "Token CSRF" })
    @ApiBody({ type: OrderRequestGuestDTO })
    async createMPGuestCustomer(@Body() dto: OrderRequestGuestDTO) {
        return await this.ordersService.createMercadoPagoOrderGuest({ orderRequest: dto });
    };


    @Get()
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Obtiene las ordenes de un cliente autenticado" })
    @ApiResponse({ status: 200, description: "Ordenes obtenidas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener las ordenes" })
    @ApiResponse({ status: 401, description: "No se proporciono un token de autenticacion" })
    @ApiResponse({ status: 403, description: "No se proporciono un token CSRF valido" })
    @ApiResponse({ status: 404, description: "No se encontro al cliente" })
    @ApiResponse({ status: 500, description: "Error inesperado al obtener las ordenes" })
    async getOrders(@AuthenticatedCustomer() customer: CustomerPayload, @Query() query: GetOrdersQuery) {
        return await this.ordersService.getOrders({ customerUUID: customer.uuid, query });
    };

    @Get("checkout/:uuid")
    @ApiOperation({ summary: "Obtiene los detalles de una orden" })
    @ApiResponse({ status: 200, description: "Items obtenidos exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener los items de la orden" })
    @ApiResponse({ status: 404, description: "No se encontro la orden" })
    @ApiResponse({ status: 500, description: "Error inesperado al obtener los items de la orden" })
    async getCheckoutOrder(@Param("uuid") uuid: string) {
        return await this.ordersService.getCheckoutOrder({ orderUUID: uuid });
    };

    @Get("details/:uuid")
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Obtiene los detalles de una orden" })
    @ApiResponse({ status: 200, description: "Items obtenidos exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener los items de la orden" })
    @ApiResponse({ status: 404, description: "No se encontro la orden" })
    @ApiResponse({ status: 500, description: "Error inesperado al obtener los items de la orden" })
    async getDetails(@AuthenticatedCustomer() customer: CustomerPayload, @Param("uuid") uuid: string) {
        return await this.ordersService.getOrderDetailsByOrderUUID({ orderUUID: uuid, customerUUID: customer.uuid });
    };

    @Post("cancel/:uuid")
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Cancela una orden" })
    @ApiResponse({ status: 200, description: "Orden cancelada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al cancelar la orden" })
    @ApiResponse({ status: 401, description: "No se proporciono un token de autenticacion" })
    @ApiResponse({ status: 403, description: "No se proporciono un token CSRF valido" })
    @ApiResponse({ status: 404, description: "No se encontro la orden" })
    @ApiResponse({ status: 500, description: "Error inesperado al cancelar la orden" })
    async cancelOrder(@Param("uuid") uuid: string) {
        return await this.ordersService.cancelOrder({ orderUUID: uuid });
    };

    @Get("buy-now/:sku")
    @ApiOperation({ summary: "Obtiene los detalles de una orden" })
    @ApiResponse({ status: 200, description: "Items obtenidos exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener los items de la orden" })
    @ApiResponse({ status: 404, description: "No se encontro la orden" })
    @ApiResponse({ status: 500, description: "Error inesperado al obtener los items de la orden" })
    async getBuyNowItem(@Param("sku") sku: string) {
        return await this.ordersService.getBuyNowItem({ sku });
    };

    @Get("dashboard")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ ORDERS: ["READ"] })
    @ApiOperation({ summary: "Obtiene los detalles de una orden" })
    @ApiResponse({ status: 200, description: "Items obtenidos exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener los items de la orden" })
    @ApiResponse({ status: 404, description: "No se encontro la orden" })
    @ApiResponse({ status: 500, description: "Error inesperado al obtener los items de la orden" })
    async getDashboard(@Query() query: OrdersDashboardParams) {
        return await this.ordersService.dashboard({ query });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ ORDERS: ["UPDATE"] })
    @ApiOperation({ summary: "Actualiza el estado de una orden" })
    @ApiResponse({ status: 200, description: "Estado de la orden actualizado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al actualizar el estado de la orden" })
    @ApiResponse({ status: 401, description: "No se proporciono un token de autenticacion" })
    @ApiResponse({ status: 403, description: "No se proporciono un token CSRF valido" })
    @ApiResponse({ status: 404, description: "No se encontro la orden" })
    @ApiResponse({ status: 500, description: "Error inesperado al actualizar el estado de la orden" })
    @ApiBody({ type: UpdateOrderStatusDTO })
    async updateOrderStatus(@Body() { orderUUID, status }: UpdateOrderStatusDTO) {
        return await this.ordersService.updateOrderStatus({ orderUUID, status });
    };
};
