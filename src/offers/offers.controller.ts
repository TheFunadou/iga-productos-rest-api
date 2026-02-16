import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OffersService } from './offers.service';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { CreateOfferDTO, GetOffers, OffersDashboardParams, UpdateOfferDTO } from './offers.dto';
import { AuthenticatedUser } from 'src/user_auth/user_auth.current_user.decorator';
import { UserPayload } from 'src/user_auth/user_auth.dto';

@Controller('offers')
export class OffersController {
    constructor(
        private readonly offersService: OffersService,
    ) { };

    @Get()
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ OFFERS: ["READ"] })
    @ApiOperation({ summary: 'Obtener las ofertas' })
    @ApiResponse({ status: 200, description: 'Ofertas obtenidas correctamente' })
    @ApiResponse({ status: 404, description: 'Ofertas no encontradas' })
    @ApiResponse({ status: 500, description: 'Error al obtener las ofertas' })
    @ApiQuery({ name: 'page', required: true, type: Number })
    @ApiQuery({ name: 'limit', required: true, type: Number })
    @ApiQuery({ name: 'orderby', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false, type: Number })
    async dashboard(@Query() query: OffersDashboardParams): Promise<GetOffers> {
        return await this.offersService.dashboard({ query });
    };

    @Post()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ OFFERS: ["CREATE"] })
    @ApiOperation({ summary: 'Crear una oferta' })
    @ApiResponse({ status: 200, description: 'Oferta creada correctamente' })
    @ApiResponse({ status: 500, description: 'Error al crear la oferta' })
    @ApiHeader({ name: 'X-CSRF-TOKEN', required: true })
    async create(@Body() body: CreateOfferDTO, @AuthenticatedUser() user: UserPayload): Promise<string> {
        return await this.offersService.create({ data: body, userUUID: user.uuid });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ OFFERS: ["UPDATE"] })
    @ApiOperation({ summary: 'Actualizar una oferta' })
    @ApiResponse({ status: 200, description: 'Oferta actualizada correctamente' })
    @ApiResponse({ status: 500, description: 'Error al actualizar la oferta' })
    @ApiHeader({ name: 'X-CSRF-TOKEN', required: true })
    async update(@Body() body: UpdateOfferDTO, @AuthenticatedUser() user: UserPayload): Promise<string> {
        return await this.offersService.update({ data: body, userUUID: user.uuid });
    };

    @Delete("/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ OFFERS: ["DELETE"] })
    @ApiOperation({ summary: 'Eliminar una oferta' })
    @ApiResponse({ status: 200, description: 'Oferta eliminada correctamente' })
    @ApiResponse({ status: 500, description: 'Error al eliminar la oferta' })
    @ApiHeader({ name: 'X-CSRF-TOKEN', required: true })
    async delete(@Param() params: { uuid: string }, @AuthenticatedUser() user: UserPayload): Promise<string> {
        return await this.offersService.delete({ uuid: params.uuid, userUUID: user.uuid });
    };
};
