import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/cache/cache.service';
import { ProductVersionFindService } from 'src/product-version/product-version.find.service';

@Injectable()
export class FavoritesService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly productVersionFindService: ProductVersionFindService
    ) { };

    private async add(args: { tx: any, customer: { id: string, uuid: string }, productVersionId: string }) {
        await args.tx.customerFavorites.create({
            data: { customer_id: args.customer.id, product_version_id: args.productVersionId }
        }).catch((error) => { throw new BadRequestException("Error al agregar el producto a favoritos") });
        await this.cacheService.invalidateQuery({ entity: "customer:favorites", query: { customer: args.customer.uuid } });
        return { added: true, message: "Producto agregado a favoritos" };
    };

    private async remove(args: { tx: any, customer: { id: string, uuid: string }, favoriteID: string }) {
        await args.tx.customerFavorites.delete({
            where: { id: args.favoriteID }
        }).catch((error) => { throw new BadRequestException("Error al eliminar el producto de favoritos") });
        await this.cacheService.invalidateQuery({ entity: "customer:favorites", query: { customer: args.customer.uuid } });
        return { removed: true, message: "Producto eliminado de favoritos" };
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

    async find(args: { pagination: { page: number, limit: number }, customerUUID: string }) {
        return await this.productVersionFindService.searchCards({
            filters: {
                limit: args.pagination.limit,
                page: args.pagination.page,
                onlyFavorites: true
            },
            customerUUID: args.customerUUID,
            entity: "customer:favorites"
        })
    };
};
