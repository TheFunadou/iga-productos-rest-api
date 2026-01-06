import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { IgaEcommerceBannerDTO, IgaEcommerceCarouselDTO, IgaEcommerceInfoBannerDTO, IgaEcommerceVideosDTO } from './e-commerce.dto';

@Injectable()
export class ECommerceService {
    constructor(
        private readonly cache: CacheService,
    ) { };

    async getCarousel(): Promise<IgaEcommerceCarouselDTO[] | null> {
        return await this.cache.getData<IgaEcommerceCarouselDTO[]>({ entity: "e-commerce:assets:carousel" });
    };

    async setCarousel(args: { data: IgaEcommerceCarouselDTO[] }) {
        await this.cache.setData({ entity: "e-commerce:assets:carousel", data: args.data });
        return "Carousel guardado correctamente";
    };

    async updateCarousel(args: { data: IgaEcommerceCarouselDTO[] }) {
        await this.cache.removeData({ entity: "e-commerce:assets:carousel" });
        await this.cache.setData({ entity: "e-commerce:assets:carousel", data: args.data });
        return "Carousel actualizado correctamente";
    };


    async getVideos(): Promise<IgaEcommerceVideosDTO[] | null> {
        return await this.cache.getData<IgaEcommerceVideosDTO[]>({ entity: "e-commerce:assets:videos" });
    };

    async setVideos(args: { data: IgaEcommerceVideosDTO[] }) {
        await this.cache.setData({ entity: "e-commerce:assets:videos", data: args.data });
        return "Videos guardados correctamente";
    };

    async updateVideos(args: { data: IgaEcommerceVideosDTO[] }) {
        await this.cache.removeData({ entity: "e-commerce:assets:videos" });
        await this.cache.setData({ entity: "e-commerce:assets:videos", data: args.data });
        return "Videos actualizados correctamente";
    };


    async getAdBanners(): Promise<IgaEcommerceBannerDTO[] | null> {
        return await this.cache.getData<IgaEcommerceBannerDTO[]>({ entity: "e-commerce:assets:ad-banners" });
    };

    async setAdBanners(args: { data: IgaEcommerceBannerDTO[] }) {
        await this.cache.setData({ entity: "e-commerce:assets:ad-banners", data: args.data });
        return "Carousel guardado correctamente";
    };

    async updateAdBanners(args: { data: IgaEcommerceBannerDTO[] }) {
        await this.cache.removeData({ entity: "e-commerce:assets:ad-banners" });
        await this.cache.setData({ entity: "e-commerce:assets:ad-banners", data: args.data });
        return "Carousel actualizado correctamente";
    };

    async getInfoBanners(): Promise<IgaEcommerceInfoBannerDTO[] | null> {
        return await this.cache.getData<IgaEcommerceInfoBannerDTO[]>({ entity: "e-commerce:assets:info-banners" });
    };

    async setInfoBanners(args: { data: IgaEcommerceInfoBannerDTO[] }) {
        await this.cache.setData({ entity: "e-commerce:assets:info-banners", data: args.data });
        return "Carousel guardado correctamente";
    };

    async updateInfoBanners(args: { data: IgaEcommerceInfoBannerDTO[] }) {
        await this.cache.removeData({ entity: "e-commerce:assets:info-banners" });
        await this.cache.setData({ entity: "e-commerce:assets:info-banners", data: args.data });
        return "Carousel actualizado correctamente";
    };



};
