import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductVersionService } from './product-version.service';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateProductVersionDTO, GetProductVersionCardsRandomOptionsDTO, GetProductVersionReviews, GetPVReviewRating, GetPVReviewResume, ProductVersionCardsFiltersDTO } from './product-version.dto';
import { ProductVersionFindService } from './product-version.find.service';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { OptionalCustomer } from 'src/customer_auth/customer_auth.optional.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { OptionalCustomerAuthGuard } from 'src/customer_auth/customer_auth.optional.guard';
import { CustomerReviewDTO } from 'src/customer/customer.dto';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { PaginationDTO } from 'src/common/DTO/pagination.dto';

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
    async create(@Body() dto: CreateProductVersionDTO) {
        return await this.productVersionService.create({ data: dto });
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
    @ApiBody({ type: CreateProductVersionDTO })
    async update(@Body() dto: CreateProductVersionDTO) {
        return await this.productVersionService.patch({ data: dto });
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
    async delete(@Query() sku: string) {
        return await this.productVersionService.delete({ sku });
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


    @Post("review")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ description: "Agregar comentario a version de producto" })
    @ApiResponse({ status: 200, description: "Comentario agregado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al agregar comentario a version de producto" })
    @ApiResponse({ status: 500, description: "Error al agregar comentario a version de producto" })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: CustomerReviewDTO })
    async addReview(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: CustomerReviewDTO): Promise<string> {
        return await this.productVersionService.addReview({ customerUUID: customer.uuid, data: dto });
    };


    @Get("review/:sku")
    @ApiOperation({ description: "Mostrar reseñas de version de producto" })
    @ApiResponse({ status: 200, description: "Reseñas de version de producto obtenidas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al mostrar reseñas de version de producto" })
    @ApiResponse({ status: 500, description: "Error al mostrar reseñas de version de producto" })
    @ApiParam({ name: "sku", description: "Buscar versiones de producto", required: true })
    @ApiQuery({ name: "page", description: "Pagina", required: true })
    @ApiQuery({ name: "limit", description: "Limite de registro a buscar", required: true })
    async showReviews(@Param("sku") sku: string, @Query() pagination: PaginationDTO): Promise<GetProductVersionReviews> {
        return await this.productVersionService.findManyReviewsBySKU({ sku, pagination });
    };

    @Get("review/resume/:sku")
    @ApiOperation({ description: "Mostrar resumen de reseñas de version de producto" })
    @ApiResponse({ status: 200, description: "Resumen de reseñas de version de producto obtenido exitosamente" })
    @ApiResponse({ status: 400, description: "Error al buscar resumen de reseñas de version de producto" })
    @ApiResponse({ status: 500, description: "Error al buscar resumen de reseñas de version de producto" })
    @ApiParam({ name: "sku", description: "Buscar versiones de producto", required: true })
    async showReviewResume(@Param("sku") sku: string): Promise<GetPVReviewResume> {
        return await this.productVersionService.getReviewRatingResumeBySKU({ sku });
    };





};
