import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShoppingCartDTO } from './shopping-cart.dto';
import { ShoppingCartUtilsService } from './shopping-cart.utils.service';

@Injectable()
export class ShoppingCartService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly utils: ShoppingCartUtilsService
    ) { };

    async get(args: { customerUUID: string }): Promise<ShoppingCartDTO[] | null> {
        return await this.cacheService.getData<ShoppingCartDTO[] | null>({ entity: "customer:shopping-cart", query: { customer: args.customerUUID } });
    };

    public async addItem(args: { customerUUID: string, item: ShoppingCartDTO }): Promise<ShoppingCartDTO[]> {
        const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
        if (shoppingCart && shoppingCart.length > 0) {
            const existing = shoppingCart.find(existing => existing.product_version.sku === args.item.product_version.sku);
            if (existing) {
                const newQty = existing.quantity + args.item.quantity;
                const versionStock: number = await this.utils.findUniquePVStock({ sku: args.item.product_version.sku });
                if (versionStock && newQty > versionStock) console.error("la cantidad de productos entrantes es mayor al stock disponible, setteando con la cantida maxima disponible de stock")
                const updated: ShoppingCartDTO[] = shoppingCart.map(exist => exist.product_version.sku === args.item.product_version.sku ? { ...exist, quantity: versionStock && newQty > versionStock ? versionStock : newQty } : exist);
                await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
                return updated;
            };
            await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: [...shoppingCart, args.item] });
            return [...shoppingCart, args.item];
        };
        await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: [args.item] });
        return [args.item];
    };

    public async updateQty(args: { customerUUID: string, sku: string, quantity: number }): Promise<ShoppingCartDTO[]> {
        const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
        if (!shoppingCart) throw new NotFoundException("No existen productos en el carrito");
        const exist = shoppingCart.find(existing => existing.product_version.sku === args.sku);
        if (!exist) throw new NotFoundException("No existe el producto al que se intenta incrementar la cantidad en el carrito");
        const versionStock = await this.utils.findUniquePVStock({ sku: args.sku });
        const updated: ShoppingCartDTO[] = shoppingCart.map(existing => existing.product_version.sku === args.sku ?
            { ...existing, quantity: versionStock && args.quantity > versionStock ? versionStock : args.quantity } :
            existing);
        await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
        return updated;
    };

    public async removeItem(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
        const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
        if (!shoppingCart) return [];
        const updated: ShoppingCartDTO[] = shoppingCart.filter(existing => existing.product_version.sku !== args.sku);
        if (updated.length === 0) { this.clearCart({ customerUUID: args.customerUUID }); return [] };
        await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
        return updated;
    };

    public async toogleCheck(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
        const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
        if (!shoppingCart) throw new Error("No existen productos en el carrtio")
        const updated: ShoppingCartDTO[] = shoppingCart.map(existing => existing.product_version.sku === args.sku ? { ...existing, isChecked: !existing.isChecked } : existing);
        await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
        return updated;
    };

    public async checkAll(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
        if (!shoppingCart) throw new Error("No existen productos en el carrtio")
        const updated: ShoppingCartDTO[] = shoppingCart.map(existing => {
            return { ...existing, isChecked: true };
        });
        await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
        return updated;
    };

    public async uncheckAll(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
        if (!shoppingCart) throw new NotFoundException("No existen productos en el carrtio")
        const updated: ShoppingCartDTO[] = shoppingCart.map(existing => {
            return { ...existing, isChecked: false };
        });
        await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
        return updated;
    };

    public async clearCart(args: { customerUUID: string }) {
        await this.cacheService.removeData({ entity: "customer:shopping_cart", query: { customerUUID: args.customerUUID } }).catch((error) => {
            throw new BadRequestException("Ocurrio un error al remover los productos del carrito");
        });
    };


};
