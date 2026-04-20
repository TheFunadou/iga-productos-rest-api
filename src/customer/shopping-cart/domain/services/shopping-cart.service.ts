import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SetItemDTO, ShoppingCartDTO } from "../../application/DTO/shopping-cart.dto";
import { AggregateCardEntitiesService } from "src/product-version/domain/services/search-cards/aggregate-entities.service";
import { ProductVersionService } from "src/product-version/product-version.service";
import { LoadShoppingCartI, ShoppingCartQueryI } from "../../application/interfaces/shopping-cart.interface";
import { calcResume } from "src/orders/helpers/order.helpers";
import { OrderCheckoutItemI } from "src/orders/applications/pipeline/interfaces/order.interface";
import { toShoppingCartItemsResumeI } from "../../helpers";

@Injectable()
export class ShoppingCartService {
    public readonly queryEntity: string = "client:shopping-cart";
    constructor(
        private readonly aggCardService: AggregateCardEntitiesService,
        private readonly cache: CacheService,
        private readonly prisma: PrismaService,
        private readonly productVersionService: ProductVersionService
    ) { };

    buildQuery({ clientUUID }: ShoppingCartQueryI) { return { uuid: clientUUID } };

    private async recoverShoppingCart({ customerUUID }: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const query = this.buildQuery({ clientUUID: customerUUID });
        return await this.cache.remember<ShoppingCartDTO[]>({
            method: "staleWhileRevalidateWithLock",
            entity: this.queryEntity,
            query,
            aditionalOptions: {
                staleTimeMilliseconds: 1000 * 60 * 15,
                ttlMilliseconds: 1000 * 60 * 20
            },
            fallback: async () => {
                const shoppingCart = await this.prisma.customer.findUnique({
                    where: { uuid: customerUUID },
                    select: {
                        shopping_carts: {
                            select: {
                                items: {
                                    select: {
                                        product_version: {
                                            select: {
                                                sku: true,
                                                product: { select: { uuid: true } }
                                            }
                                        },
                                        is_checked: true,
                                        quantity: true,
                                    },
                                    orderBy: { updated_at: "asc" }
                                }
                            }
                        }
                    }
                });

                if (!shoppingCart) return [];

                return shoppingCart.shopping_carts.map(sc => sc.items.map(item => ({
                    item: {
                        productUUID: item.product_version.product.uuid,
                        sku: item.product_version.sku
                    },
                    quantity: item.quantity,
                    isChecked: item.is_checked
                }))).flat() satisfies ShoppingCartDTO[];
            }
        });
    };


    async getShoppingCart({ clientUUID, isCustomer }: { clientUUID: string, isCustomer: boolean }): Promise<ShoppingCartDTO[]> {
        if (isCustomer) return await this.recoverShoppingCart({ customerUUID: clientUUID });
        const query = this.buildQuery({ clientUUID });
        const shoppingCart = await this.cache.getData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query
        });
        if (!shoppingCart || shoppingCart.length === 0) return [];
        return shoppingCart;
    };


    resolveClient({ customerUUID, sessionId }: { customerUUID?: string, sessionId?: string }): { clientUUID: string, isCustomer: boolean } {
        if (customerUUID) return { clientUUID: customerUUID, isCustomer: true };
        if (sessionId) return { clientUUID: sessionId, isCustomer: false };
        throw new Error("No se proporciono un cliente");
    };

    async resolveStock({ sku, quantity }: { sku: string, quantity: number }) {
        const stock = await this.aggCardService.aggregateProductVersionStock({ skuList: [sku] });
        if (quantity > stock[0].stock) return stock[0].stock;
        return quantity;
    };

    private async getItemsData({ shoppingCart }: { shoppingCart: ShoppingCartDTO[] }): Promise<{
        versionId: string,
        quantity: number,
        isChecked: boolean
    }[]> {
        const skuList: string[] = shoppingCart.map(s => s.item.sku);
        const items = await this.aggCardService.aggregateProductVersions({ skuList });

        const productMap = new Map(
            items.map(p => [p.sku, p])
        );

        const itemsData = shoppingCart.flatMap(cartItem => {
            const product = productMap.get(cartItem.item.sku);

            if (!product) return [];

            return [{
                versionId: product.id,
                quantity: cartItem.quantity,
                isChecked: cartItem.isChecked
            }];
        });

        return itemsData;
    };

    async getCustomerShoppingCart({ customerUUID, sessionId }: { customerUUID: string, sessionId: string }): Promise<ShoppingCartDTO[]> {
        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        return await this.getShoppingCart({ clientUUID, isCustomer });
    };

    async setItem(args: { customerUUID?: string, sessionId?: string, data: SetItemDTO }): Promise<ShoppingCartDTO[]> {
        try {
            const { customerUUID, sessionId, data } = args;

            const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
            const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });
            const existingItem = shoppingCart.find(i => i.item.sku === data.item.item.sku);

            let updatedCart: ShoppingCartDTO[];

            if (existingItem) {
                const newQty = data.type === "set" ? data.item.quantity : existingItem.quantity + data.item.quantity;
                const resolvedQuantity = await this.resolveStock({
                    sku: data.item.item.sku,
                    quantity: newQty
                });
                updatedCart = shoppingCart.map(i =>
                    i.item.sku === data.item.item.sku
                        ? { ...i, quantity: resolvedQuantity }
                        : i
                );
            } else {
                const resolvedQuantity = await this.resolveStock({
                    sku: data.item.item.sku,
                    quantity: data.item.quantity
                });
                updatedCart = [
                    ...shoppingCart,
                    { ...data.item, quantity: resolvedQuantity }
                ];
            };

            const query = this.buildQuery({ clientUUID });
            await this.cache.setData<ShoppingCartDTO[]>({
                entity: this.queryEntity,
                query,
                data: updatedCart,
                aditionalOptions: {
                    staleTimeMilliseconds: 1000 * 60 * 15,
                    ttlMilliseconds: 1000 * 60 * 20
                }
            });

            return updatedCart;
        } catch (error) {
            console.error("Error al agregar el producto al carrito", error);
            throw new BadRequestException("Error al agregar el producto al carrito");
        }
    };

    async removeItem(args: { customerUUID?: string, sessionId?: string, sku: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId, sku } = args;

        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });

        const updatedCart = shoppingCart.filter(i => i.item.sku !== sku);

        const query = this.buildQuery({ clientUUID });
        await this.cache.setData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query,
            data: updatedCart
        });

        return updatedCart;
    };

    async toggleCheckItem(args: { customerUUID?: string, sessionId?: string, sku: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId, sku } = args;

        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });

        const updatedCart = shoppingCart.map(i =>
            i.item.sku === sku
                ? { ...i, isChecked: !i.isChecked }
                : i
        );

        const query = this.buildQuery({ clientUUID });
        await this.cache.setData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query,
            data: updatedCart,
            aditionalOptions: {
                staleTimeMilliseconds: 1000 * 60 * 15,
                ttlMilliseconds: 1000 * 60 * 20
            }
        });

        return updatedCart;
    };

    async checkAllItems(args: { customerUUID?: string, sessionId?: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId } = args;

        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });

        const updatedCart = shoppingCart.map(i => ({ ...i, isChecked: true }));

        const query = this.buildQuery({ clientUUID });
        await this.cache.setData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query,
            data: updatedCart,
            aditionalOptions: {
                staleTimeMilliseconds: 1000 * 60 * 15,
                ttlMilliseconds: 1000 * 60 * 20
            }
        });

        return updatedCart;
    };

    async uncheckAllItems(args: { customerUUID?: string, sessionId?: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId } = args;

        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });

        const updatedCart = shoppingCart.map(i => ({ ...i, isChecked: false }));

        const query = this.buildQuery({ clientUUID });
        await this.cache.setData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query,
            data: updatedCart,
            aditionalOptions: {
                staleTimeMilliseconds: 1000 * 60 * 15,
                ttlMilliseconds: 1000 * 60 * 20
            }
        });

        return updatedCart;
    };

    async clearShoppingCart(args: { customerUUID?: string, sessionId?: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId } = args;
        const { clientUUID } = this.resolveClient({ customerUUID, sessionId });
        const query = this.buildQuery({ clientUUID });
        await this.cache.setData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query,
            data: [],
            aditionalOptions: {
                staleTimeMilliseconds: 1000 * 60 * 15,
                ttlMilliseconds: 1000 * 60 * 20
            }
        });

        return [];
    };


    async mergeShoppingCart(args: { customerUUID?: string, sessionId?: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId } = args;
        if (!sessionId) throw new NotFoundException("No se encontro la sesión del cliente");
        const sessionShoppingCart = await this.getShoppingCart({ clientUUID: sessionId, isCustomer: false });

        if (!customerUUID) throw new NotFoundException("No se encontro el cliente");
        const customerShoppingCart = await this.getShoppingCart({ clientUUID: customerUUID, isCustomer: true });

        const mergedShoppingCart = [...sessionShoppingCart, ...customerShoppingCart];
        const query = this.buildQuery({ clientUUID: customerUUID });
        await this.cache.setData<ShoppingCartDTO[]>({
            entity: this.queryEntity,
            query,
            data: mergedShoppingCart
        });

        return mergedShoppingCart;
    };

    async createShoppingCart(args: { customerUUID?: string, sessionId?: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sessionId } = args;
        if (!sessionId) throw new NotFoundException("No se encontro la sesión del cliente");
        const sessionShoppingCart = await this.getShoppingCart({ clientUUID: sessionId, isCustomer: false });

        const customerId = await this.prisma.customer.findUnique({
            where: { uuid: customerUUID },
            select: { id: true }
        });

        if (!customerId) throw new NotFoundException("No se encontro el cliente");

        return await this.prisma.$transaction(async (tx) => {
            const created = await tx.shoppingCart.create({
                data: { customer_id: customerId.id },
                select: { id: true }
            });
            if (sessionShoppingCart.length > 0) {
                const itemsData = await this.getItemsData({ shoppingCart: sessionShoppingCart })
                await tx.shoppingCartItems.createMany({
                    data: itemsData.map(i => ({
                        shopping_cart_id: created.id,
                        product_version_id: i.versionId,
                        quantity: i.quantity,
                        is_checked: i.isChecked
                    }))
                });

            }
            return sessionShoppingCart;
        });
    };


    async saveShoppingCart({ customerUUID }: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const customer = await this.prisma.customer.findUnique({
            where: { uuid: customerUUID },
            select: { id: true }
        });
        if (!customer) throw new NotFoundException("No se encontro el cliente");

        const shoppingCart = await this.getShoppingCart({ clientUUID: customerUUID, isCustomer: true });
        return await this.prisma.$transaction(async (tx) => {
            const created = await tx.shoppingCart.create({
                data: { customer_id: customer.id },
                select: { id: true }
            });

            const itemsData = await this.getItemsData({ shoppingCart })

            if (itemsData.length === 0) {
                await tx.shoppingCartItems.deleteMany({
                    where: { shopping_cart_id: created.id }
                });
            };

            for (const item of itemsData) {
                await tx.shoppingCartItems.upsert({
                    where: {
                        shopping_cart_id_product_version_id: {
                            shopping_cart_id: created.id,
                            product_version_id: item.versionId
                        }
                    },
                    update: {
                        quantity: item.quantity,
                        is_checked: item.isChecked
                    },
                    create: {
                        shopping_cart_id: created.id,
                        product_version_id: item.versionId,
                        quantity: item.quantity,
                        is_checked: item.isChecked
                    }
                });
            };

            return shoppingCart;
        });
    };


    async loadShoppingCart({ customerUUID, sessionId }: { customerUUID?: string, sessionId: string }): Promise<LoadShoppingCartI> {
        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });
        if (!shoppingCart || shoppingCart.length === 0) return {
            cards: [],
            shoppingCart: [],
        };

        const map = new Map<string, string[]>();
        for (const { item: { productUUID, sku } } of shoppingCart) {
            if (!map.has(productUUID)) {
                map.set(productUUID, []);
            }
            map.get(productUUID)!.push(sku);
        };
        const productsList = Array.from(map, ([productUUID, sku]) => ({
            productUUID,
            sku
        }));
        const cards = await this.productVersionService.getCards({ customerUUID, productsList, scope: "internal" });
        const items = toShoppingCartItemsResumeI({ cards: cards.data, shoppingCart });
        const resume = calcResume({ items });
        return { cards: cards.data, shoppingCart, resume };
    };


    async updateShoppingCartByApprovedOrder({ customerUUID, sessionId, orderItems }: { customerUUID?: string, sessionId: string, orderItems: OrderCheckoutItemI[] }) {
        const { clientUUID, isCustomer } = this.resolveClient({ customerUUID, sessionId });
        const shoppingCart = await this.getShoppingCart({ clientUUID, isCustomer });
        const orderItemsMap = new Map(orderItems.map(i => [i.sku, i.sku]));
        const updatedCart = shoppingCart.filter(i => !orderItemsMap.has(i.item.sku));
        await this.cache.setData<ShoppingCartDTO[]>({ entity: this.queryEntity, query: { uuid: customerUUID }, data: updatedCart });
    };

};