import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ECommerceService } from './e-commerce.service';
import { IgaEcommerceBannerDTO, IgaEcommerceCarouselDTO, IgaEcommerceInfoBannerDTO, IgaEcommerceVideosDTO } from './e-commerce.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';

@Controller('e-commerce')
export class ECommerceController {
    constructor(private readonly eCommerseService: ECommerceService) { };

    @Get('carousel')
    @ApiOperation({ summary: 'Obtener el carousel' })
    @ApiResponse({ status: 200, description: 'Carousel obtenido correctamente' })
    @ApiResponse({ status: 404, description: 'Carousel no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al obtener el carousel' })
    async getCarousel(): Promise<IgaEcommerceCarouselDTO[] | null> {
        return await this.eCommerseService.getCarousel();
    };

    @Post('carousel')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["CREATE"] })
    @ApiOperation({ summary: 'Establecer el carousel' })
    @ApiResponse({ status: 200, description: 'Carousel establecido correctamente' })
    @ApiResponse({ status: 404, description: 'Carousel no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al establecer el carousel' })
    async setCarousel(@Body() body: IgaEcommerceCarouselDTO[]) {
        return await this.eCommerseService.setCarousel({ data: body });
    };

    @Put('carousel')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["UPDATE"] })
    @ApiOperation({ summary: 'Actualizar el carousel' })
    @ApiResponse({ status: 200, description: 'Carousel actualizado correctamente' })
    @ApiResponse({ status: 404, description: 'Carousel no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al actualizar el carousel' })
    async updateCarousel(@Body() body: IgaEcommerceCarouselDTO[]) {
        return await this.eCommerseService.updateCarousel({ data: body });
    };

    @Get("videos")
    @ApiOperation({ summary: 'Obtener los videos' })
    @ApiResponse({ status: 200, description: 'Videos obtenidos correctamente' })
    @ApiResponse({ status: 404, description: 'Videos no encontrados' })
    @ApiResponse({ status: 500, description: 'Error al obtener los videos' })
    async getVideos(): Promise<IgaEcommerceVideosDTO[] | null> {
        return await this.eCommerseService.getVideos();
    };

    @Post('videos')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["CREATE"] })
    @ApiOperation({ summary: 'Establecer los videos' })
    @ApiResponse({ status: 200, description: 'Videos establecidos correctamente' })
    @ApiResponse({ status: 404, description: 'Videos no encontrados' })
    @ApiResponse({ status: 500, description: 'Error al establecer los videos' })
    async setVideos(@Body() body: IgaEcommerceVideosDTO[]) {
        return await this.eCommerseService.setVideos({ data: body });
    };

    @Put('videos')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["UPDATE"] })
    @ApiOperation({ summary: 'Actualizar los videos' })
    @ApiResponse({ status: 200, description: 'Videos actualizados correctamente' })
    @ApiResponse({ status: 404, description: 'Videos no encontrados' })
    @ApiResponse({ status: 500, description: 'Error al actualizar los videos' })
    async updateVideos(@Body() body: IgaEcommerceVideosDTO[]) {
        return await this.eCommerseService.updateVideos({ data: body });
    };

    @Get('banner')
    @ApiOperation({ summary: 'Obtener el banner' })
    @ApiResponse({ status: 200, description: 'Banner obtenido correctamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al obtener el banner' })
    async getBanner(): Promise<IgaEcommerceBannerDTO[] | null> {
        return await this.eCommerseService.getAdBanners();
    };

    @Post('banner')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["CREATE"] })
    @ApiOperation({ summary: 'Establecer el banner' })
    @ApiResponse({ status: 200, description: 'Banner establecido correctamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al establecer el banner' })
    async setBanner(@Body() body: IgaEcommerceBannerDTO[]) {
        return await this.eCommerseService.setAdBanners({ data: body });
    };

    @Put('banner')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["UPDATE"] })
    @ApiOperation({ summary: 'Actualizar el banner' })
    @ApiResponse({ status: 200, description: 'Banner actualizado correctamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al actualizar el banner' })
    async updateBanner(@Body() body: IgaEcommerceBannerDTO[]) {
        return await this.eCommerseService.updateAdBanners({ data: body });
    };

    @Get('info-banner')
    @ApiOperation({ summary: 'Obtener el banner' })
    @ApiResponse({ status: 200, description: 'Banner obtenido correctamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al obtener el banner' })
    async getInfoBanner(): Promise<IgaEcommerceInfoBannerDTO[] | null> {
        return await this.eCommerseService.getInfoBanners();
    };

    @Post('info-banner')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["CREATE"] })
    @ApiOperation({ summary: 'Establecer el banner' })
    @ApiResponse({ status: 200, description: 'Banner establecido correctamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al establecer el banner' })
    async setInfoBanner(@Body() body: IgaEcommerceInfoBannerDTO[]) {
        return await this.eCommerseService.setInfoBanners({ data: body });
    };

    @Put('info-banner')
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ E_COMMERCE_PAGE: ["UPDATE"] })
    @ApiOperation({ summary: 'Actualizar el banner' })
    @ApiResponse({ status: 200, description: 'Banner actualizado correctamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    @ApiResponse({ status: 500, description: 'Error al actualizar el banner' })
    async updateInfoBanner(@Body() body: IgaEcommerceInfoBannerDTO[]) {
        return await this.eCommerseService.updateInfoBanners({ data: body });
    };
};
