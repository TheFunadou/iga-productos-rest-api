import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { CreateProductDTO, GetDashboardReviews, GetProductReviewResume, GetProductReviews, PatchProductDTO } from './product.dto';
import { AuthenticatedUser } from 'src/user_auth/user_auth.current_user.decorator';
import { UserPayload } from 'src/user_auth/user_auth.dto';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerReviewDTO } from 'src/customer/customer.dto';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { PaginationDTO } from 'src/common/DTO/pagination.dto';
import { StockDashboardParams } from 'src/product-version/product-version.dto';

@Controller('product')
export class ProductController {
    constructor(
        private readonly productService: ProductService
    ) { };

    @Post()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["CREATE"] })
    @ApiOperation({ summary: 'Crear un nuevo producto' })
    @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: CreateProductDTO })
    async createProduct(@AuthenticatedUser() user: UserPayload, @Body() dto: CreateProductDTO) {
        return this.productService.create({ userUUID: user.uuid, data: dto });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["UPDATE"] })
    @ApiOperation({ summary: 'Actualizar un producto' })
    @ApiResponse({ status: 200, description: 'Producto actualizado exitosamente' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: PatchProductDTO })
    async updateProduct(@AuthenticatedUser() user: UserPayload, @Body() dto: PatchProductDTO) {
        return this.productService.patch({ userUUID: user.uuid, data: dto });
    };

    @Delete("/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["DELETE"] })
    @ApiOperation({ summary: 'Eliminar un producto' })
    @ApiResponse({ status: 200, description: 'Producto eliminado exitosamente' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async deleteProduct(@AuthenticatedUser() user: UserPayload, @Param("uuid") uuid: string) {
        return this.productService.delete({ userUUID: user.uuid, productUUID: uuid });
    };

    @Get("search")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["READ"] })
    @ApiOperation({ summary: 'Buscar productos' })
    @ApiResponse({ status: 200, description: 'Productos encontrados exitosamente' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @ApiQuery({ name: "search", description: "Buscar productos", required: true })
    async searchProducts(@Query("search") query: string) {
        return this.productService.search({ query });
    };

    @Get("details/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["READ"] })
    @ApiOperation({ summary: 'Ver detalles de un producto' })
    @ApiResponse({ status: 200, description: 'Productos encontrados exitosamente' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @ApiParam({ name: "uuid", description: "Buscar productos", required: true })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async showDetailsByUUID(@Param("uuid") uuid: string) {
        return this.productService.showDetailsByUUID({ uuid });
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
        return await this.productService.addReview({ customerUUID: customer.uuid, data: dto });
    };


    @Get("review/:uuid")
    @ApiOperation({ description: "Mostrar reseñas de version de producto" })
    @ApiResponse({ status: 200, description: "Reseñas de version de producto obtenidas exitosamente" })
    @ApiResponse({ status: 400, description: "Error al mostrar reseñas de version de producto" })
    @ApiResponse({ status: 500, description: "Error al mostrar reseñas de version de producto" })
    @ApiParam({ name: "uuid", description: "Buscar versiones de producto", required: true })
    @ApiQuery({ name: "page", description: "Pagina", required: true })
    @ApiQuery({ name: "limit", description: "Limite de registro a buscar", required: true })
    async showReviews(@Param("uuid") uuid: string, @Query() pagination: PaginationDTO): Promise<GetProductReviews> {
        return await this.productService.findManyReviewsByUUID({ productUUID: uuid, pagination });
    };

    @Get("review/resume/:uuid")
    @ApiOperation({ description: "Mostrar resumen de reseñas de version de producto" })
    @ApiResponse({ status: 200, description: "Resumen de reseñas de version de producto obtenido exitosamente" })
    @ApiResponse({ status: 400, description: "Error al buscar resumen de reseñas de version de producto" })
    @ApiResponse({ status: 500, description: "Error al buscar resumen de reseñas de version de producto" })
    @ApiParam({ name: "uuid", description: "Buscar versiones de producto", required: true })
    async showReviewResume(@Param("uuid") uuid: string): Promise<GetProductReviewResume> {
        return await this.productService.getReviewRatingResumeByUUID({ productUUID: uuid });
    };


    @Get("reviews/dashboard")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["READ"] })
    @ApiOperation({ description: "Obtener dashboard de stock" })
    @ApiResponse({ status: 200, description: "Dashboard de stock obtenido exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener dashboard de stock" })
    @ApiResponse({ status: 500, description: "Error al obtener dashboard de stock" })
    @ApiQuery({ name: "limit", description: "Limite de registro a buscar", required: true })
    @ApiQuery({ name: "page", description: "Pagina", required: true })
    @ApiQuery({ name: "orderBy", description: "Ordenamiento", required: false })
    @ApiQuery({ name: "type", description: "Tipo de busqueda", required: false })
    @ApiQuery({ name: "value", description: "Busqueda", required: false })
    async getReviewDashboard(@Query() params: StockDashboardParams): Promise<GetDashboardReviews> {
        return await this.productService.getReviewsDashboard({ params });
    };

    @Delete("review/:sku/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["DELETE"] })
    @ApiOperation({ description: "Eliminar unas reseña de un producto" })
    @ApiResponse({ status: 200, description: "Reseña eliminada exitosamente" })
    @ApiResponse({ status: 400, description: "Error al eliminar reseña" })
    @ApiResponse({ status: 404, description: "No se encontro la reseña" })
    @ApiResponse({ status: 500, description: "Error al eliminar reseña" })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async deleteReview(@AuthenticatedUser() user: UserPayload, @Param("uuid") uuid: string, @Param("sku") sku: string): Promise<string> {
        return await this.productService.deleteReview({ sku, uuid, userUUID: user.uuid });
    };

};
