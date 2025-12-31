import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { CreateProductDTO, PatchProductDTO } from './product.dto';
import { AuthenticatedUser } from 'src/user_auth/user_auth.current_user.decorator';
import { UserPayload } from 'src/user_auth/user_auth.dto';

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
    async updateProduct(@Body() dto: PatchProductDTO) {
        return this.productService.patch({ data: dto });
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
    async deleteProduct(@Param("uuid") uuid: string) {
        return this.productService.delete({ uuid });
    };

    @Get("search")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["READ"] })
    @ApiOperation({ summary: 'Buscar productos' })
    @ApiResponse({ status: 200, description: 'Productos encontrados exitosamente' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    @ApiQuery({ name: "search", description: "Buscar productos", required: true })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async searchProducts(@Query() query: string) {
        return this.productService.search({ query });
    };

    @Get("details/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
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
};
