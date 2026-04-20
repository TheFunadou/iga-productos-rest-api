import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ToggleFavoriteDTO } from './favorites.dto';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';

@Controller('favorites')
export class FavoritesController {
    constructor(
        private readonly favoritesService: FavoritesService
    ) { };

    @Post()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Cambiar estado de favorito de un producto" })
    @ApiResponse({ status: 200, description: "Favorito agregado o eliminado" })
    @ApiResponse({ status: 400, description: "Error al cambiar el estado de favorito" })
    @ApiResponse({ status: 404, description: "No se encontro al cliente o la versión del producto" })
    @ApiResponse({ status: 500, description: "Error al cambiar el estado de favorito" })
    @ApiBody({ type: ToggleFavoriteDTO })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF" })
    async toogleFavorite(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: ToggleFavoriteDTO) {
        return await this.favoritesService.toogleFavorite({ customerUUID: customer.uuid, sku: dto.sku });
    };

};
