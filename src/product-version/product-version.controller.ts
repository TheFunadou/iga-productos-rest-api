import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductVersionService } from './product-version.service';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateProductVersionDTO, GetProductVersionCardsRandomOptionsDTO, PatchProductVersionDTO, ProductVersionCardsFiltersDTO, StockDashboardParams, UpdateStockBySKUDTO } from './product-version.dto';
import { ProductVersionFindService } from './product-version.find.service';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { OptionalCustomer } from 'src/customer_auth/customer_auth.optional.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { OptionalCustomerAuthGuard } from 'src/customer_auth/customer_auth.optional.guard';
import { AuthenticatedUser } from 'src/user_auth/user_auth.current_user.decorator';
import { UserPayload } from 'src/user_auth/user_auth.dto';

@Controller('product-version')
export class ProductVersionController {
    constructor(
        private readonly findProductVersionService: ProductVersionFindService,
        private readonly productVersionService: ProductVersionService
    ) { };

    @Post()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["CREATE"] })
    @ApiOperation({ description: "Crear version de producto" })
    @ApiResponse({ status: 201, description: "Version de producto creada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al crear version de producto" })
    @ApiResponse({ status: 404, description: "No se encontro el producto padre relacionado a la version" })
    @ApiResponse({ status: 500, description: "Error al crear version de producto" })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: CreateProductVersionDTO })
    async create(@Body() dto: CreateProductVersionDTO, @AuthenticatedUser() user: UserPayload) {
        return await this.productVersionService.create({ data: dto, userUUID: user.uuid });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["UPDATE"] })
    @ApiOperation({ description: "Actualizar version de producto" })
    @ApiResponse({ status: 200, description: "Version de producto actualizada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al actualizar version de producto" })
    @ApiResponse({ status: 404, description: "No se encontro el producto padre relacionado a la version" })
    @ApiResponse({ status: 500, description: "Error al actualizar version de producto" })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: PatchProductVersionDTO })
    async update(@Body() dto: PatchProductVersionDTO, @AuthenticatedUser() user: UserPayload) {
        return await this.productVersionService.patch({ data: dto, userUUID: user.uuid });
    };

    @Delete()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["DELETE"] })
    @ApiOperation({ description: "Eliminar version de producto" })
    @ApiResponse({ status: 200, description: "Version de producto eliminada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al eliminar version de producto" })
    @ApiResponse({ status: 404, description: "No se encontro el producto padre relacionado a la version" })
    @ApiResponse({ status: 500, description: "Error al eliminar version de producto" })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async delete(@Query() sku: string, @AuthenticatedUser() user: UserPayload) {
        return await this.productVersionService.delete({ sku, userUUID: user.uuid });
    };

    @Get("list/:input")
    @ApiOperation({ description: "Listar versiones de producto" })
    @ApiResponse({ status: 200, description: "Versiones de producto listadas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al listar versiones de producto" })
    @ApiResponse({ status: 500, description: "Error al listar versiones de producto" })
    @ApiParam({ name: "input", description: "Buscar versiones de producto", required: true })
    async listByInput(@Param("input") input: string) {
        return await this.productVersionService.list({ input });
    };

    @Post("search")
    @UseGuards(OptionalCustomerAuthGuard)
    @ApiOperation({ description: "Buscar versiones de producto" })
    @ApiResponse({ status: 200, description: "Versiones de producto buscadas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al buscar versiones de producto" })
    @ApiResponse({ status: 500, description: "Error al buscar versiones de producto" })
    @ApiBody({ type: ProductVersionCardsFiltersDTO })
    async search(@OptionalCustomer() customer: CustomerPayload, @Body() dto: ProductVersionCardsFiltersDTO) {
        return await this.findProductVersionService.searchCards({ filters: dto, customerUUID: customer?.uuid });
    };

    @Get("random-cards")
    @UseGuards(OptionalCustomerAuthGuard)
    @ApiOperation({ description: "Buscar versiones de producto" })
    @ApiResponse({ status: 200, description: "Versiones de producto buscadas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al buscar versiones de producto" })
    @ApiResponse({ status: 500, description: "Error al buscar versiones de producto" })
    @ApiQuery({ name: "limit", description: "Limite de registro a buscar", required: true })
    @ApiQuery({ name: "entity", description: "Entidad", required: true })
    async findRandomCards(@OptionalCustomer() customer: CustomerPayload, @Query() dto: GetProductVersionCardsRandomOptionsDTO) {
        return await this.findProductVersionService.findRandomCards({ options: dto, customerUUID: customer?.uuid });
    };

    @Get("details/:sku")
    @UseGuards(OptionalCustomerAuthGuard)
    @ApiOperation({ description: "Buscar versiones de producto" })
    @ApiResponse({ status: 200, description: "Versiones de producto buscadas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al buscar versiones de producto" })
    @ApiResponse({ status: 500, description: "Error al buscar versiones de producto" })
    @ApiParam({ name: "sku", description: "Buscar versiones de producto", required: true })
    async showDetails(@OptionalCustomer() customer: CustomerPayload, @Param("sku") sku: string) {
        return await this.findProductVersionService.showDetails({ sku, customerUUID: customer?.uuid });
    };


    @Get("stock/dashboard")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["READ"] })
    @ApiOperation({ description: "Obtener dashboard de stock" })
    @ApiResponse({ status: 200, description: "Dashboard de stock obtenido exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener dashboard de stock" })
    @ApiResponse({ status: 500, description: "Error al obtener dashboard de stock" })
    @ApiQuery({ name: "limit", description: "Limite de registro a buscar", required: true })
    @ApiQuery({ name: "page", description: "Pagina", required: true })
    @ApiQuery({ name: "orderBy", description: "Ordenamiento", required: true })
    @ApiQuery({ name: "type", description: "Tipo de busqueda", required: false })
    @ApiQuery({ name: "value", description: "Busqueda", required: false })
    async getStockDashboard(@Query() params: StockDashboardParams) {
        return await this.productVersionService.stockDashboard({ params });
    };

    @Patch("stock")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["UPDATE"] })
    @ApiOperation({ description: "Actualizar stock de version de producto" })
    @ApiResponse({ status: 200, description: "Stock de version de producto actualizado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al actualizar stock de version de producto" })
    @ApiResponse({ status: 404, description: "No se encontro la version de producto" })
    @ApiResponse({ status: 500, description: "Error al actualizar stock de version de producto" })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: UpdateStockBySKUDTO })
    async updateStock(@Body() dto: UpdateStockBySKUDTO, @AuthenticatedUser() user: UserPayload) {
        return await this.productVersionService.updateStock({ dto, userUUID: user.uuid });
    };


};
