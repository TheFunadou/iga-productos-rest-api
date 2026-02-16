import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDTO, GetSubcategories, PatchSubcategoryDTO } from './subcategories.dto';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { AuthenticatedUser } from 'src/user_auth/user_auth.current_user.decorator';
import { UserPayload } from 'src/user_auth/user_auth.dto';

@Controller('subcategories')
export class SubcategoriesController {
    constructor(
        private readonly subcategoriesService: SubcategoriesService
    ) { };

    @Post()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ SUBCATEGORIES: ["CREATE"] })
    @ApiOperation({ summary: "Crear subcategoria" })
    @ApiResponse({ status: 201, description: "Subcategoria creada exitosamente", type: String })
    @ApiResponse({ status: 400, description: "Error al crear la subcategoria", type: String })
    @ApiResponse({ status: 404, description: "No se encontro la categoria principal/padre", type: String })
    @ApiResponse({ status: 500, description: "Error al crear la subcategoria", type: String })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: CreateSubcategoryDTO })
    async create(@Body() dto: CreateSubcategoryDTO, @AuthenticatedUser() user: UserPayload) {
        return await this.subcategoriesService.create({ data: dto, userUUID: user.uuid });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ SUBCATEGORIES: ["UPDATE"] })
    @ApiOperation({ summary: "Actualizar subcategoria" })
    @ApiResponse({ status: 200, description: "Subcategoria actualizada exitosamente", type: String })
    @ApiResponse({ status: 400, description: "Error al actualizar la subcategoria", type: String })
    @ApiResponse({ status: 404, description: "No se encontro la subcategoria", type: String })
    @ApiResponse({ status: 500, description: "Error al actualizar la subcategoria", type: String })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: PatchSubcategoryDTO })
    async update(@Body() dto: PatchSubcategoryDTO, @AuthenticatedUser() user: UserPayload) {
        return await this.subcategoriesService.patch({ data: dto, userUUID: user.uuid });
    };

    @Delete("/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ SUBCATEGORIES: ["DELETE"] })
    @ApiOperation({ summary: "Eliminar subcategoria" })
    @ApiResponse({ status: 200, description: "Subcategoria eliminada exitosamente", type: String })
    @ApiResponse({ status: 400, description: "Error al eliminar la subcategoria", type: String })
    @ApiResponse({ status: 404, description: "No se encontro la subcategoria", type: String })
    @ApiResponse({ status: 500, description: "Error al eliminar la subcategoria", type: String })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiParam({ name: "uuid", description: "UUID de la subcategoria", required: true })
    async delete(@Param("uuid") uuid: string, @AuthenticatedUser() user: UserPayload) {
        return await this.subcategoriesService.delete({ subcategoryUUID: uuid, userUUID: user.uuid });
    };

    @Get("/:category_uuid")
    @ApiOperation({ summary: "Listar subcategorias" })
    @ApiResponse({ status: 200, description: "Subcategorias listadas exitosamente", type: GetSubcategories, isArray: true })
    @ApiResponse({ status: 400, description: "Error al listar las subcategorias", type: String })
    @ApiResponse({ status: 404, description: "No se encontro la categoria principal/padre", type: String })
    @ApiResponse({ status: 500, description: "Error al listar las subcategorias", type: String })
    async findAll(@Param("category_uuid") category_uuid: string) {
        return await this.subcategoriesService.findAllByCategoryUUID({ categoryUUID: category_uuid });
    };
}
