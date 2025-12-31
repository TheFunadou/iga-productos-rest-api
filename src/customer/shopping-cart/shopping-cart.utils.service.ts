import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ShoppingCartDTO } from "./shopping-cart.dto";


@Injectable()
export class ShoppingCartUtilsService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly prisma: PrismaService
    ) { };

    async findUniquePVStock(args: { tx?: any, sku: string }): Promise<number> {
        return await this.cacheService.remember<number>({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:stock",
            query: { sku: args.sku },
            fallback: async () => {
                const stock = args.tx ?
                    await args.tx.product_version.findUnique({ where: { sku: args.sku }, select: { stock: true } }) :
                    await this.prisma.productVersion.findUnique({ where: { sku: args.sku }, select: { stock: true } });
                if (!stock) throw new NotFoundException("No se encontro la version de producto");
                return stock.stock;
            }
        });
    };

    async findManyPVStocks(args: { tx?: any, skus: string[] }): Promise<number[]> {
        return await this.cacheService.remember<number[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:stock",
            query: { sku_list: args.skus },
            fallback: async () => {
                const stocks = args.tx ?
                    await args.tx.product_version.findMany({ where: { sku: { in: args.skus } }, select: { sku: true, stock: true } }).catch((error) => {
                        throw new NotFoundException("Ocurrio un error inesperado al obtener los stocks de los productos")
                    }) :
                    await this.prisma.productVersion.findMany({ where: { sku: { in: args.skus } }, select: { sku: true, stock: true } }).catch((error) => {
                        throw new NotFoundException("Ocurrio un error inesperado al obtener los stocks de los productos")
                    });
                return stocks.map((stock) => stock.stock);
            }
        });
    };

    async setShoppingCart(args: { customerUUID: string, data: ShoppingCartDTO | ShoppingCartDTO[] }) {
        await this.cacheService.setData<ShoppingCartDTO | ShoppingCartDTO[]>({
            entity: "customer:shopping-cart",
            query: { customer: args.customerUUID },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60 * 24 * 7,
            },
            data: args.data
        }).catch((error) => {
            throw new BadRequestException("Error al guardar articulos en carrito de compras");
        });
    };



};