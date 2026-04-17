import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/cache/cache.service';
// import { ProductVersionFindService } from 'src/product-version/product-version.find.service';

@Injectable()
export class FavoritesService {
    private readonly logger = new Logger(FavoritesService.name);
    private readonly nodeEnv = process.env.NODE_ENV;
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        // private readonly productVersionFindService: ProductVersionFindService
    ) { };

    private async add(args: { tx: any, customer: { id: string, uuid: string }, productVersionId: string }) {
        try {
            await args.tx.customerFavorites.create({
                data: { customer_id: args.customer.id, product_version_id: args.productVersionId }
            });
            await this.cache.invalidateMultipleEntities([
                { entity: `customer:favorites:${args.customer.uuid}` },
                { entity: `product-version:search:cards:${args.customer.uuid}` }
            ]);
            return { added: true, message: "Producto agregado a favoritos" };
        } catch (error) {
            this.logger.error("[FavoritesService] error al agregar el producto a favoritos", error);
            throw new BadRequestException(`Error al agregar el producto a favoritos ${this.nodeEnv === "DEV" && `: ${error}`}`)
        }
    };

    private async remove(args: { tx: any, customer: { id: string, uuid: string }, favoriteID: string }) {
        try {
            await args.tx.customerFavorites.delete({
                where: { id: args.favoriteID }
            });
            await this.cache.invalidateMultipleEntities([
                { entity: `customer:favorites:${args.customer.uuid}` },
                { entity: `product-version:search:cards:${args.customer.uuid}` }
            ]);
            return { removed: true, message: "Producto eliminado de favoritos" };
        } catch (error) {
            this.logger.error("[FavoritesService] error al eliminar el producto de favoritos", error);
            throw new BadRequestException(`Error al eliminar el producto de favoritos ${this.nodeEnv === "DEV" && `: ${error}`}`)
        }
    };

    async toogleFavorite(args: { customerUUID: string, sku: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
            if (!customer) throw new NotFoundException("No se encontro al cliente");
            const productVersion = await tx.productVersion.findFirst({ where: { sku: { mode: "insensitive", equals: args.sku } }, select: { id: true } });
            if (!productVersion) throw new NotFoundException("No se encontro la versión del producto");
            const existsFav = await tx.customerFavorites.findFirst({
                where: { customer_id: customer.id, product_version_id: productVersion.id },
                select: { id: true, added_at: true }
            });
            if (!existsFav) return await this.add({ tx, customer: { id: customer.id, uuid: args.customerUUID }, productVersionId: productVersion.id });
            return await this.remove({ tx, customer: { id: customer.id, uuid: args.customerUUID }, favoriteID: existsFav.id });
        });
    }

    async favoritesList({ customerUUID }: { customerUUID?: string }) {
        if (!customerUUID) return [];
        return await this.cache.remember<string[]>({
            method: "staleWhileRevalidate",
            entity: "customer:favorites",
            query: { customerUUID },
            fallback: async () => {
                const favoritesList = await this.prisma.customerFavorites.findMany({
                    where: { customer: { uuid: customerUUID } },
                    select: { product_version: { select: { sku: true } } }
                });

                return favoritesList.map((favorite) => favorite.product_version.sku);
            }
        })
    }

    // async find({ pagination: { page, limit }, customerUUID }: { pagination: { page: number, limit: number }, customerUUID: string }) {
    //     return await this.productVersionFindService.searchCards({
    //         filters: {
    //             limit,
    //             page,
    //             onlyFavorites: true
    //         },
    //         customerUUID,
    //         entity: `customer:favorites:${customerUUID}`,
    //         scope: "internal"
    //     })
    // };
};
