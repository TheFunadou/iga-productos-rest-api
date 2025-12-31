import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ShoppingCartService } from './shopping-cart.service';
import { ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { ShoppingCartDTO, ToggleCheckDTO, UpdateItemQtyDTO } from './shopping-cart.dto';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';

@Controller('shopping-cart')
export class ShoppingCartController {
    constructor(
        private readonly shoppingCartService: ShoppingCartService
    ) { };

    @Get()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Obtener el carrito de compras" })
    @ApiResponse({ status: 200, description: "Información recuperada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al recuperar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async getShoppingCart(@AuthenticatedCustomer() customer: CustomerPayload): Promise<ShoppingCartDTO[] | null> {
        return await this.shoppingCartService.get({ customerUUID: customer.uuid });
    };

    @Post()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Añadir productos al carrito de compras" })
    @ApiResponse({ status: 200, description: "Información guardada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al guardar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async addItem(@AuthenticatedCustomer() customer: CustomerPayload, @Body() item: ShoppingCartDTO): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.addItem({ customerUUID: customer.uuid, item });
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
    async updateQty(@AuthenticatedCustomer() customer: CustomerPayload, @Body() item: UpdateItemQtyDTO): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.updateQty({ customerUUID: customer.uuid, sku: item.sku, quantity: item.newQuantity });
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

    @Patch("check/toggle")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Seleccionar/Deseleccionar un producto del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async toogleCheck(@AuthenticatedCustomer() customer: CustomerPayload, @Body() data: ToggleCheckDTO): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.toogleCheck({ customerUUID: customer.uuid, sku: data.sku });
    };

    @Patch("check/all")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Seleccionar todos los productos del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async checkAll(@AuthenticatedCustomer() customer: CustomerPayload): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.checkAll({ customerUUID: customer.uuid });
    };

    @Patch("uncheck/all")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Deseleccionar todos los productos del carrito de compras" })
    @ApiResponse({ status: 200, description: "Información actualizada", type: ShoppingCartDTO, isArray: true })
    @ApiResponse({ status: 400, description: "Ocurrio un error al actualizar la información" })
    @ApiResponse({ status: 500, description: "Ocurrio un error inesperado" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF", required: true })
    async uncheckAll(@AuthenticatedCustomer() customer: CustomerPayload): Promise<ShoppingCartDTO[]> {
        return await this.shoppingCartService.uncheckAll({ customerUUID: customer.uuid });
    };

};
