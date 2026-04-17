import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ShoppingCartService } from './shopping-cart.service';
import { ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { AddItemDTO, ShoppingCartDTO, ToggleCheckDTO, UpdateItemQtyDTO } from './shopping-cart.dto';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { SetItemDTO, ShoppingCartDTO as ShoppingCartDTOV2, ToggleCheckV2DTO } from './application/DTO/shopping-cart.dto';
import { OptionalCustomer } from 'src/customer_auth/customer_auth.optional.decorator';
import { Cookie } from 'src/common/decorators/cookie.decorator';
import { ShoppingCartServiceV2 } from './domain/services/shopping-cart.service';
import { LoadShoppingCartI } from './application/interfaces/shopping-cart.interface';
import { OptionalCustomerAuthGuard } from 'src/customer_auth/customer_auth.optional.guard';

@Controller('shopping-cart')
export class ShoppingCartController {
    constructor(
        private readonly shoppingCartService: ShoppingCartService,
        private readonly shoppingCartServiceV2: ShoppingCartServiceV2
    ) { };

    @Get()
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Obtener el carrito de compras" })
    @ApiResponse({ status: 200, description: "Información recuperada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al recuperar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    async getShoppingCart(@AuthenticatedCustomer() customer: CustomerPayload): Promise<ShoppingCartDTO[] | null> {
        return await this.shoppingCartService.getShoppingCart({ customerUUID: customer.uuid });
    };

    @Post()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Añadir productos al carrito de compras" })
    @ApiResponse({ status: 200, description: "Información guardada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al guardar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async addItem(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: AddItemDTO): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.addItem({ customerUUID: customer.uuid, dto });
    };

    @Delete()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Eliminar todos los productos del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: String })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async clearCart(@AuthenticatedCustomer() customer: CustomerPayload) {
        return await this.shoppingCartService.clearCart({ customerUUID: customer.uuid });
    };

    @Patch("quantity")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Actualizar la cantidad de un producto del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async updateQty(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: UpdateItemQtyDTO): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.updateQty({ customerUUID: customer.uuid, dto });
    };


    @Delete(":sku")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Eliminar un producto del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async removeItem(@AuthenticatedCustomer() customer: CustomerPayload, @Param("sku") sku: string): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.removeItem({ customerUUID: customer.uuid, sku });
    };

    @Put("check/toggle")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Seleccionar/Deseleccionar un producto del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async toogleCheck(@AuthenticatedCustomer() customer: CustomerPayload, @Body() data: ToggleCheckDTO): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.toggleCheck({ customerUUID: customer.uuid, sku: data.sku });
    };

    @Put("check/all")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Seleccionar todos los productos del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async checkAll(@AuthenticatedCustomer() customer: CustomerPayload): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.checkAll({ customerUUID: customer.uuid });
    };

    @Put("uncheck/all")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Deseleccionar todos los productos del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async uncheckAll(@AuthenticatedCustomer() customer: CustomerPayload): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.uncheckAll({ customerUUID: customer.uuid });
    };


    @Get('v2')
    @ApiOperation({ summary: "Recuperar el carrito de compras (V2 - Redis/DB)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async recoverShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.getCustomerShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2/item')
    @ApiOperation({ summary: "Añadir o actualizar cantidad de un producto (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async setItemV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string,
        @Body() dto: SetItemDTO
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.setItem({
            customerUUID: customer?.uuid,
            sessionId,
            data: dto
        });
    };
    @Delete('v2/clear-cart')
    @UseGuards(OptionalCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Vaciar el carrito de compras (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async clearCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.clearShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };


    @Delete('v2/:sku')
    @ApiOperation({ summary: "Eliminar un producto del carrito (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async removeItemV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string,
        @Param('sku') sku: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.removeItem({
            customerUUID: customer?.uuid,
            sessionId,
            sku
        });
    };
    @Put('v2/check/toggle')
    @ApiOperation({ summary: "Seleccionar/Deseleccionar un producto (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async toggleCheckV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string,
        @Body() dto: ToggleCheckV2DTO
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.toggleCheckItem({
            customerUUID: customer?.uuid,
            sessionId,
            sku: dto.sku
        });
    };
    @Put('v2/check/all')
    @ApiOperation({ summary: "Seleccionar todos los productos (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async checkAllV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.checkAllItems({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Put('v2/uncheck/all')
    @ApiOperation({ summary: "Deseleccionar todos los productos (V2)" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async uncheckAllV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.uncheckAllItems({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2')
    @ApiOperation({ summary: "Crear carrito en base de datos desde sesión (V2)" })
    @ApiResponse({ status: 201, type: ShoppingCartDTOV2, isArray: true })
    async createShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.createShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2/merge')
    @ApiOperation({ summary: "Fusionar carrito de sesión con carrito de cliente (V2)" })
    @ApiResponse({ status: 201, type: ShoppingCartDTOV2, isArray: true })
    async mergeShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<ShoppingCartDTOV2[]> {
        return await this.shoppingCartServiceV2.mergeShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };
    @Post('v2/save')
    @ApiOperation({ summary: "Persistir carrito actual a la base de datos (V2)" })
    @ApiResponse({ status: 201, type: ShoppingCartDTOV2, isArray: true })
    async saveShoppingCartV2(
        @OptionalCustomer() customer: CustomerPayload
    ): Promise<ShoppingCartDTOV2[]> {
        // Nota: saveShoppingCart solo tiene sentido si el usuario está autenticado
        return await this.shoppingCartServiceV2.saveShoppingCart({
            customerUUID: customer?.uuid
        });
    };

    @Get("v2/load")
    @ApiOperation({ summary: "Cargar tarjetas del carrito de compras" })
    @ApiResponse({ status: 200, type: ShoppingCartDTOV2, isArray: true })
    async loadCards(
        @OptionalCustomer() customer: CustomerPayload,
        @Cookie('session_id') sessionId: string
    ): Promise<LoadShoppingCartI> {
        return await this.shoppingCartServiceV2.loadShoppingCart({
            customerUUID: customer?.uuid,
            sessionId
        });
    };



};
