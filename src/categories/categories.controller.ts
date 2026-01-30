import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDTO, SummaryCategories, GetCategories, PatchCategoryDTO } from './categories.dto';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';

@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService: CategoriesService
    ) { };

    @Get()
    @ApiOperation({ summary: "Obtener todas las categorías" })
    @ApiResponse({ status: 200, type: GetCategories, isArray: true })
    @ApiResponse({ status: 404, type: Error })
    @ApiResponse({ status: 500, type: Error })
    async findAll(): Promise<GetCategories[]> {
        return await this.categoriesService.findAll();
    };

    @Post("")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ CATEGORIES: ["CREATE"] })
    @ApiOperation({ summary: "Crear una categoría" })
    @ApiResponse({ status: 201, type: GetCategories })
    @ApiResponse({ status: 400, type: Error })
    @ApiResponse({ status: 500, type: Error })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: CreateCategoryDTO })
    async create(@Body() dto: CreateCategoryDTO): Promise<GetCategories> {
        return await this.categoriesService.create({ data: dto });
    };


    @Patch("/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ CATEGORIES: ["UPDATE"] })
    @ApiOperation({ summary: "Actualizar una categoría" })
    @ApiResponse({ status: 200, type: GetCategories })
    @ApiResponse({ status: 400, type: Error })
    @ApiResponse({ status: 500, type: Error })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiBody({ type: PatchCategoryDTO })
    async patch(@Body() dto: PatchCategoryDTO): Promise<GetCategories> {
        return await this.categoriesService.patch({ data: dto });
    };

    @Get("summary")
    @ApiOperation({ summary: "Obtener todas las categorías con sus imágenes" })
    @ApiResponse({ status: 200, type: SummaryCategories, isArray: true })
    @ApiResponse({ status: 404, type: Error })
    @ApiResponse({ status: 500, type: Error })
    async getCategoriesExtended(): Promise<SummaryCategories[]> {
        return await this.categoriesService.summaryCategories();
    };

};
