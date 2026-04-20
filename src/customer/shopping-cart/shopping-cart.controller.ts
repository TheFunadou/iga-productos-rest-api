import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { SetItemDTO, ShoppingCartDTO, ToggleCheckV2DTO } from './application/DTO/shopping-cart.dto';
import { OptionalCustomer } from 'src/customer_auth/customer_auth.optional.decorator';
import { Cookie } from 'src/common/decorators/cookie.decorator';
import { LoadShoppingCartI } from './application/interfaces/shopping-cart.interface';
import { OptionalCustomerAuthGuard } from 'src/customer_auth/customer_auth.optional.guard';
import { ShoppingCartService } from './domain/services/shopping-cart.service';

@Controller('shopping-cart')
export class ShoppingCartController {
    constructor(
        private readonly shoppingCartService: ShoppingCartService
    ) { };

    @Get('v2')
    @ApiOperation({ summary: "Recuperar el carrito de compras (V2 - Redis/DB)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async recoverShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.getCustomerShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2/item')
    @ApiOperation({ summary: "Añadir o actualizar cantidad de un producto (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async setItem(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string,
        @Body() dto: SetItemDTO
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.setItem({
            customerUUID: customer?.uuid,
            sessionId,
            data: dto
        });
    };
    @Delete('v2/clear-cart')
    @UseGuards(OptionalCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Vaciar el carrito de compras (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async clearCart(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.clearShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };


    @Delete('v2/:sku')
    @ApiOperation({ summary: "Eliminar un producto del carrito (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async removeItemV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string,
        @Param('sku') sku: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.removeItem({
            customerUUID: customer?.uuid,
            sessionId,
            sku
        });
    };
    @Put('v2/check/toggle')
    @ApiOperation({ summary: "Seleccionar/Deseleccionar un producto (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async toggleCheckV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string,
        @Body() dto: ToggleCheckV2DTO
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.toggleCheckItem({
            customerUUID: customer?.uuid,
            sessionId,
            sku: dto.sku
        });
    };
    @Put('v2/check/all')
    @ApiOperation({ summary: "Seleccionar todos los productos (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async checkAllV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.checkAllItems({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Put('v2/uncheck/all')
    @ApiOperation({ summary: "Deseleccionar todos los productos (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async uncheckAllV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.uncheckAllItems({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2')
    @ApiOperation({ summary: "Crear carrito en base de datos desde sesión (V2)" })
    @ApiResponse({ status: 201, type: ShoppingCartDTO, isArray: true })
    async createShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.createShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2/merge')
    @ApiOperation({ summary: "Fusionar carrito de sesión con carrito de cliente (V2)" })
    @ApiResponse({ status: 201, type: ShoppingCartDTO, isArray: true })
    async mergeShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.mergeShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2/save')
    @ApiOperation({ summary: "Persistir carrito actual a la base de datos (V2)" })
    @ApiResponse({ status: 201, type: ShoppingCartDTO, isArray: true })
    async saveShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload
    ): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.saveShoppingCart({
            customerUUID: customer?.uuid
        });
    };

    @Get("v2/load")
    @ApiOperation({ summary: "Cargar tarjetas del carrito de compras" })
    @ApiResponse({ status: 200, type: ShoppingCartDTO, isArray: true })
    async loadCards(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<LoadShoppingCartI> {
        return await this.shoppingCartService.loadShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };



};
