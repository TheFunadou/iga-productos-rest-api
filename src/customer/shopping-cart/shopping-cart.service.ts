import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemDTO, ShoppingCartDTO, UpdateItemQtyDTO } from './shopping-cart.dto';
import { ShoppingCartUtilsService } from './shopping-cart.utils.service';
import { OffersUtilsService } from 'src/offers/offers.utils.service';

@Injectable()
export class ShoppingCartService {
    private readonly nodeEnv = process.env.NODE_ENV;
    constructor(
        private readonly cacheService: CacheService,
        private readonly utils: ShoppingCartUtilsService,
        private readonly prisma: PrismaService,
        private readonly offersUtilsService: OffersUtilsService
    ) { };



    public async getShoppingCart(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID } = args;
        return await this.cacheService.remember<ShoppingCartDTO[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "customer:shopping-cart",
            query: { customerUUID },
            fallback: async () => {
                const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
                if (!customer) throw new NotFoundException("No se encontro el cliente");
                const data = await this.prisma.shoppingCart.findFirst({
                    where: { customer_id: customer.id },
                    select: {
                        items: {
                            select: {
                                uuid: true,
                                quantity: true,
                                is_checked: true,
                                product_version: {
                                    select: {
                                        id: true,
                                        unit_price: true,
                                        sku: true,
                                        color_line: true,
                                        color_name: true,
                                        color_code: true,
                                        stock: true,
                                        product_version_images: {
                                            where: { main_image: true },
                                            select: { main_image: true, image_url: true },
                                            orderBy: { main_image: "desc" as const }
                                        },
                                        product: {
                                            select: {
                                                id: true,
                                                category_id: true,
                                                product_name: true,
                                                category: { select: { name: true } },
                                                subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
                                            }
                                        },
                                        customer_favorites: {
                                            select: { added_at: true }
                                        }
                                    }
                                }

                            }
                        }
                    }
                });
                if (!data) return [];

                const productVersionsData = data.items.map(r => ({
                    versionId: r.product_version.id,
                    productId: r.product_version.product.id,
                    categoryId: r.product_version.product.category_id,
                    subcategoryIds: r.product_version.product.subcategories.map(s => s.subcategories.uuid)
                }));

                const discountsMap = await this.offersUtilsService.checkMultipleProductVersionsDiscounts(productVersionsData);

                const shoppingCart: ShoppingCartDTO[] = data.items.map((item) => {
                    const discountInfo = discountsMap.get(item.product_version.id.toString()) || { discount: 0, isOffer: false };
                    const unitPriceWithDiscount = parseFloat(item.product_version.unit_price.toString()) - (parseFloat(item.product_version.unit_price.toString()) * (discountInfo.discount / 100));
                    return {
                        uuid: item.uuid,
                        category: item.product_version.product.category.name,
                        subcategories: item.product_version.product.subcategories.map((sub) => sub.subcategories.description),
                        isChecked: true,
                        product_images: item.product_version.product_version_images,
                        product_name: item.product_version.product.product_name,
                        product_version: {
                            color_code: item.product_version.color_code,
                            color_name: item.product_version.color_name,
                            color_line: item.product_version.color_line,
                            sku: item.product_version.sku,
                            unit_price: item.product_version.unit_price,
                            stock: item.product_version.stock,
                            unit_price_with_discount: discountInfo.isOffer ? unitPriceWithDiscount.toFixed(2).toString() : undefined,
                        },
                        quantity: item.quantity,
                        discount: discountInfo.discount,
                        isFavorite: (item.product_version.customer_favorites && item.product_version.customer_favorites.length > 0) ?? false,
                        isOffer: discountInfo.isOffer
                    }
                });

                return shoppingCart;
            }
        })
    }

    // async get(args: { customerUUID: string }): Promise<ShoppingCartDTO[] | null> {
    //     return await this.cacheService.getData<ShoppingCartDTO[] | null>({ entity: "customer:shopping-cart", query: { customerUUID: args.customerUUID } });
    // };


    // public async addItem(args: { customerUUID: string, item: ShoppingCartDTO }): Promise<ShoppingCartDTO[]> {
    //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID: args.customerUUID });
    //     const productVersion = await this.prisma.productVersion.findFirst({ where: { sku: { equals: args.item.product_version.sku, mode: "insensitive" } }, select: { id: true } });
    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");
    //     if (!productVersion) throw new NotFoundException("No se encontro la version del producto");
    //     const existingCustomerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (existingCustomerCart && shoppingCart.length > 0) {
    //         const existing = shoppingCart.find((exist) => exist.product_version.sku === args.item.product_version.sku);
    //         if (existing) {
    //             const newQty = existing.quantity + args.item.quantity;
    //             const versionStock: number = await this.utils.findUniquePVStock({ sku: args.item.product_version.sku });
    //             if (versionStock && newQty > versionStock) console.error("la cantidad de productos entrantes es mayor al stock disponible, setteando con la cantida maxima disponible de stock")
    //             const updated = shoppingCart.map(exist => exist.product_version.sku === args.item.product_version.sku ? { ...exist, quantity: versionStock && newQty > versionStock ? versionStock : newQty } : exist);
    //             await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
    //             await this.prisma.shoppingCartItems.update({
    //                 where: { product_version_id: productVersion.id, shopping_cart_id: existingCustomerCart.id },
    //                 data: { quantity: versionStock && newQty > versionStock ? versionStock : newQty }
    //             });
    //             return updated;
    //         };
    //         await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: [...shoppingCart, args.item] });

    //         await this.prisma.shoppingCartItems.create({
    //             data: {
    //                 product_version_id: productVersion.id,
    //                 shopping_cart_id: existingCustomerCart.id,
    //                 quantity: args.item.quantity,
    //             }
    //         });
    //         return [...shoppingCart, args.item];
    //     };
    //     await this.prisma.$transaction(async (tx) => {
    //         const customerCart = await tx.shoppingCart.create({
    //             data: { customer_id: customer.id },
    //             select: { id: true }
    //         })
    //         await tx.shoppingCartItems.create({
    //             data: {
    //                 product_version_id: productVersion.id,
    //                 shopping_cart_id: customerCart.id,
    //                 quantity: args.item.quantity,
    //             }
    //         });
    //     })
    //     await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: [args.item] });
    //     return [args.item];
    // };

    // // public async addItem(args: { customerUUID: string, item: ShoppingCartDTO }): Promise<ShoppingCartDTO[]> {
    // //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID: args.customerUUID });
    // //     if (shoppingCart && shoppingCart.length > 0) {
    // //         const existing = shoppingCart.find(existing => existing.product_version.sku === args.item.product_version.sku);
    // //         return await this.prisma.$transaction(async (tx) => {
    // //             if (existing) {
    // //                 const newQty = existing.quantity + args.item.quantity;
    // //                 const versionStock: number = await this.utils.findUniquePVStock({ tx, sku: args.item.product_version.sku });
    // //                 if (versionStock && newQty > versionStock) console.error("la cantidad de productos entrantes es mayor al stock disponible, setteando con la cantida maxima disponible de stock")
    // //                 const updated: ShoppingCartDTO[] = shoppingCart.map(exist => exist.product_version.sku === args.item.product_version.sku ? { ...exist, quantity: versionStock && newQty > versionStock ? versionStock : newQty } : exist);
    // //                 await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
    // //                 return updated;
    // //             };
    // //             await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: [...shoppingCart, args.item] });
    // //             return [...shoppingCart, args.item];
    // //         })
    // //     };
    // //     await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: [args.item] });
    // //     return [args.item];
    // // };

    // public async updateQty(args: { customerUUID: string, dto: UpdateItemQtyDTO }): Promise<ShoppingCartDTO[]> {
    //     const { dto: { sku, newQuantity }, customerUUID } = args;
    //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID });
    //     if (!shoppingCart) throw new NotFoundException("No existen productos en el carrito");
    //     const exist = shoppingCart.find(existing => existing.product_version.sku === sku);
    //     if (!exist) throw new NotFoundException("No existe el producto al que se intenta incrementar la cantidad en el carrito");
    //     const versionStock = await this.utils.findUniquePVStock({ sku });
    //     const newQty = versionStock && newQuantity > versionStock ? versionStock : newQuantity;
    //     const updated: ShoppingCartDTO[] = shoppingCart.map(existing => existing.product_version.sku === sku ?
    //         { ...existing, quantity: newQty } : existing);
    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");
    //     const productVersion = await this.prisma.productVersion.findFirst({ where: { sku: { equals: sku, mode: "insensitive" } }, select: { id: true } });
    //     if (!productVersion) throw new NotFoundException("No existe el producto al que se intenta incrementar la cantidad en el carrito");
    //     const customerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (!customerCart) throw new NotFoundException("No se encontro el carrito del cliente");
    //     await this.utils.setShoppingCart({ customerUUID, data: updated });
    //     await this.prisma.shoppingCartItems.update({ where: { product_version_id: productVersion.id, shopping_cart_id: customerCart.id }, data: { quantity: newQty } });
    //     return updated;
    // };

    // // public async updateQty(args: { customerUUID: string, sku: string, quantity: number }): Promise<ShoppingCartDTO[]> {
    // //     const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
    // //     if (!shoppingCart) throw new NotFoundException("No existen productos en el carrito");
    // //     const exist = shoppingCart.find(existing => existing.product_version.sku === args.sku);
    // //     if (!exist) throw new NotFoundException("No existe el producto al que se intenta incrementar la cantidad en el carrito");
    // //     const versionStock = await this.utils.findUniquePVStock({ sku: args.sku });
    // //     const updated: ShoppingCartDTO[] = shoppingCart.map(existing => existing.product_version.sku === args.sku ?
    // //         { ...existing, quantity: versionStock && args.quantity > versionStock ? versionStock : args.quantity } :
    // //         existing);
    // //     await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
    // //     return updated;
    // // };


    // public async removeItem(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
    //     const { customerUUID, sku } = args;
    //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID });
    //     if (!shoppingCart) return [];
    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");
    //     const productVersion = await this.prisma.productVersion.findFirst({ where: { sku: { equals: sku, mode: "insensitive" } }, select: { id: true } });
    //     if (!productVersion) throw new NotFoundException("No existe el producto al que se intenta incrementar la cantidad en el carrito");
    //     const customerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (!customerCart) throw new NotFoundException("No se encontro el carrito del cliente");
    //     const updated: ShoppingCartDTO[] = shoppingCart.filter(existing => existing.product_version.sku !== sku);
    //     if (updated.length === 0) {
    //         this.clearCart({ customerUUID });
    //         await this.prisma.shoppingCartItems.deleteMany({ where: { shopping_cart_id: customerCart.id } });
    //         return [];
    //     };
    //     await this.prisma.shoppingCartItems.delete({ where: { product_version_id: productVersion.id, shopping_cart_id: customerCart.id } });
    //     await this.utils.setShoppingCart({ customerUUID, data: updated });
    //     return updated;
    // };

    // // public async removeItem(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
    // //     const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
    // //     if (!shoppingCart) return [];
    // //     const updated: ShoppingCartDTO[] = shoppingCart.filter(existing => existing.product_version.sku !== args.sku);
    // //     if (updated.length === 0) { this.clearCart({ customerUUID: args.customerUUID }); return [] };
    // //     await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
    // //     return updated;
    // // };


    // public async toogleCheck(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
    //     const { customerUUID, sku } = args;
    //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID });
    //     if (!shoppingCart) throw new Error("No existen productos en el carrito");
    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");
    //     const productVersion = await this.prisma.productVersion.findFirst({ where: { sku: { equals: sku, mode: "insensitive" } }, select: { id: true } });
    //     if (!productVersion) throw new NotFoundException("No existe el producto al que se intenta incrementar la cantidad en el carrito");
    //     const customerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (!customerCart) throw new NotFoundException("No se encontro el carrito del cliente");
    //     const item = shoppingCart.find(existing => existing.product_version.sku === sku);
    //     if (!item) throw new NotFoundException("No se encontro el producto en el carrito");
    //     await this.prisma.shoppingCartItems.update({ where: { product_version_id: productVersion.id, shopping_cart_id: customerCart.id }, data: { is_checked: !item.isChecked } })
    //     const updated: ShoppingCartDTO[] = shoppingCart.map(existing => existing.product_version.sku === args.sku ? { ...existing, isChecked: !existing.isChecked } : existing);
    //     await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
    //     return updated;
    // };


    // // public async toogleCheck(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
    // //     const shoppingCart: ShoppingCartDTO[] | null = await this.get({ customerUUID: args.customerUUID });
    // //     if (!shoppingCart) throw new Error("No existen productos en el carrito");
    // //     const updated: ShoppingCartDTO[] = shoppingCart.map(existing => existing.product_version.sku === args.sku ? { ...existing, isChecked: !existing.isChecked } : existing);
    // //     await this.utils.setShoppingCart({ customerUUID: args.customerUUID, data: updated });
    // //     return updated;
    // // };

    // public async checkAll(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
    //     const { customerUUID } = args;
    //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID });
    //     if (!shoppingCart) throw new Error("No existen productos en el carrito");

    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");

    //     const customerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (!customerCart) throw new NotFoundException("No se encontro el carrito del cliente");

    //     const updated: ShoppingCartDTO[] = shoppingCart.map(existing => {
    //         return { ...existing, isChecked: true };
    //     });

    //     await this.utils.setShoppingCart({ customerUUID, data: updated });
    //     await this.prisma.shoppingCartItems.updateMany({
    //         where: { shopping_cart_id: customerCart.id },
    //         data: { is_checked: true }
    //     });

    //     return updated;
    // };

    // public async uncheckAll(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
    //     const { customerUUID } = args;
    //     const shoppingCart: ShoppingCartDTO[] | null = await this.getShoppingCart({ customerUUID });
    //     if (!shoppingCart) throw new NotFoundException("No existen productos en el carrito");

    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");

    //     const customerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (!customerCart) throw new NotFoundException("No se encontro el carrito del cliente");

    //     const updated: ShoppingCartDTO[] = shoppingCart.map(existing => {
    //         return { ...existing, isChecked: false };
    //     });

    //     await this.utils.setShoppingCart({ customerUUID, data: updated });
    //     await this.prisma.shoppingCartItems.updateMany({
    //         where: { shopping_cart_id: customerCart.id },
    //         data: { is_checked: false }
    //     });

    //     return updated;
    // };

    // public async clearCart(args: { customerUUID: string }) {
    //     const { customerUUID } = args;
    //     console.log("Eliminado carrito");

    //     const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
    //     if (!customer) throw new NotFoundException("No se encontro el cliente");

    //     const customerCart = await this.prisma.shoppingCart.findUnique({ where: { customer_id: customer.id }, select: { id: true } });
    //     if (!customerCart) throw new NotFoundException("No se encontro el carrito del cliente");

    //     await this.prisma.shoppingCartItems.deleteMany({ where: { shopping_cart_id: customerCart.id } });

    //     await this.cacheService.removeData({ entity: "customer:shopping-cart", query: { customerUUID } }).catch((error) => {
    //         throw new BadRequestException("Ocurrio un error al remover los productos del carrito", this.nodeEnv === "DEVELOPMENT" && error);
    //     });
    // };

    private async getCustomerCartInfo(args: { customerUUID: string, tx?: any }) {
        const { customerUUID, tx } = args;
        const prisma = tx || this.prisma;

        const customer = await prisma.customer.findUnique({
            where: { uuid: customerUUID },
            select: { id: true, shopping_cart: { select: { id: true } } }
        });

        if (!customer) throw new NotFoundException("No se encontró el cliente");
        if (!customer.shopping_cart) throw new NotFoundException("No se encontró el carrito del cliente");

        return {
            customerId: customer.id,
            cartId: customer.shopping_cart.id
        };
    };

    public async addItem(args: { customerUUID: string, dto: AddItemDTO }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, dto } = args;

        await this.prisma.$transaction(async (tx) => {
            // 1. Obtener customer y cart en una sola query optimizada
            const customer = await tx.customer.findUnique({
                where: { uuid: customerUUID },
                select: { id: true, shopping_carts: { select: { id: true } } }
            });
            if (!customer) throw new NotFoundException("No se encontró el cliente");

            // 2. Verificar que el producto existe y tiene stock
            const productVersion = await tx.productVersion.findFirst({
                where: { sku: { equals: dto.sku, mode: "insensitive" } },
                select: { id: true, stock: true }
            });

            if (!productVersion) throw new NotFoundException("No se encontró la versión del producto");
            if (productVersion.stock < dto.quantity) throw new BadRequestException(`Stock insuficiente. Disponible: ${productVersion.stock}`);

            // 3. Crear o actualizar el carrito
            let cartId: string;
            if (customer.shopping_carts && customer.shopping_carts.length > 0) {
                cartId = customer.shopping_carts[0].id;
                // Verificar si el item ya existe
                const existingItem = await tx.shoppingCartItems.findUnique({
                    where: {
                        shopping_cart_id_product_version_id: {
                            product_version_id: productVersion.id,
                            shopping_cart_id: cartId
                        }
                    },
                    select: { quantity: true }
                });

                if (existingItem) {
                    const newQty = Math.min(existingItem.quantity + dto.quantity, productVersion.stock);
                    await tx.shoppingCartItems.update({
                        where: {
                            shopping_cart_id_product_version_id: {
                                product_version_id: productVersion.id,
                                shopping_cart_id: cartId
                            }
                        },
                        data: { quantity: newQty }
                    });
                } else {
                    await tx.shoppingCartItems.create({
                        data: {
                            product_version_id: productVersion.id,
                            shopping_cart_id: cartId,
                            quantity: dto.quantity,
                        }
                    });
                }
            } else {
                // Crear nuevo carrito
                const newCart = await tx.shoppingCart.create({
                    data: { customer_id: customer.id },
                    select: { id: true }
                });

                cartId = newCart.id;

                await tx.shoppingCartItems.create({
                    data: {
                        product_version_id: productVersion.id,
                        shopping_cart_id: cartId,
                        quantity: dto.quantity,
                    }
                });
            }
        });

        // 4. DESPUÉS de que la transacción se confirme, invalidar caché
        await this.cacheService.removeData({
            entity: "customer:shopping-cart",
            query: { customerUUID }
        });

        // 5. Retornar el carrito actualizado desde la BD (ahora sí con los cambios confirmados)
        const result = await this.getShoppingCart({ customerUUID });
        return result;
    };

    public async updateQty(args: { customerUUID: string, dto: UpdateItemQtyDTO }): Promise<ShoppingCartDTO[]> {
        const { dto: { sku, newQuantity }, customerUUID } = args;

        return await this.prisma.$transaction(async (tx) => {
            const { cartId } = await this.getCustomerCartInfo({ customerUUID, tx });

            const productVersion = await tx.productVersion.findFirst({
                where: { sku: { equals: sku, mode: "insensitive" } },
                select: { id: true, stock: true }
            });

            if (!productVersion) throw new NotFoundException("No se encontró el producto");

            const finalQty = Math.min(newQuantity, productVersion.stock);

            await tx.shoppingCartItems.update({
                where: {
                    shopping_cart_id_product_version_id: {
                        product_version_id: productVersion.id,
                        shopping_cart_id: cartId
                    }
                },
                data: { quantity: finalQty }
            });

            // Invalidar caché
            await this.cacheService.removeData({
                entity: "customer:shopping-cart",
                query: { customerUUID }
            });

            // Después de invalidar
            const result = await this.getShoppingCart({ customerUUID });
            console.log("🔍 Backend returning:", result.length, "items");
            return result;
            // return await this.getShoppingCart({ customerUUID });
        });
    };

    public async removeItem(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sku } = args;

        return await this.prisma.$transaction(async (tx) => {
            const { cartId } = await this.getCustomerCartInfo({ customerUUID, tx });

            const productVersion = await tx.productVersion.findFirst({
                where: { sku: { equals: sku, mode: "insensitive" } },
                select: { id: true }
            });

            if (!productVersion) throw new NotFoundException("No se encontró el producto");

            await tx.shoppingCartItems.delete({
                where: {
                    shopping_cart_id_product_version_id: {
                        product_version_id: productVersion.id,
                        shopping_cart_id: cartId
                    }
                }
            });

            // Verificar si el carrito quedó vacío
            const remainingItems = await tx.shoppingCartItems.count({
                where: { shopping_cart_id: cartId }
            });

            if (remainingItems === 0) {
                await this.cacheService.removeData({
                    entity: "customer:shopping-cart",
                    query: { customerUUID }
                });
                return [];
            }

            await this.cacheService.removeData({
                entity: "customer:shopping-cart",
                query: { customerUUID }
            });

            return await this.getShoppingCart({ customerUUID });
        });
    };

    public async toggleCheck(args: { customerUUID: string, sku: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID, sku } = args;

        return await this.prisma.$transaction(async (tx) => {
            const { cartId } = await this.getCustomerCartInfo({ customerUUID, tx });

            const productVersion = await tx.productVersion.findFirst({
                where: { sku: { equals: sku, mode: "insensitive" } },
                select: { id: true }
            });

            if (!productVersion) throw new NotFoundException("No se encontró el producto");

            const item = await tx.shoppingCartItems.findUnique({
                where: {
                    shopping_cart_id_product_version_id: {
                        product_version_id: productVersion.id,
                        shopping_cart_id: cartId
                    }
                },
                select: { is_checked: true }
            });

            if (!item) throw new NotFoundException("No se encontró el producto en el carrito");

            await tx.shoppingCartItems.update({
                where: {
                    shopping_cart_id_product_version_id: {
                        product_version_id: productVersion.id,
                        shopping_cart_id: cartId
                    }
                },
                data: { is_checked: !item.is_checked }
            });

            await this.cacheService.removeData({
                entity: "customer:shopping-cart",
                query: { customerUUID }
            });

            return await this.getShoppingCart({ customerUUID });
        });
    };

    public async checkAll(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID } = args;

        return await this.prisma.$transaction(async (tx) => {
            const { cartId } = await this.getCustomerCartInfo({ customerUUID, tx });

            await tx.shoppingCartItems.updateMany({
                where: { shopping_cart_id: cartId },
                data: { is_checked: true }
            });

            // Invalidar caché
            await this.cacheService.removeData({
                entity: "customer:shopping-cart",
                query: { customerUUID }
            });

            return await this.getShoppingCart({ customerUUID });
        });
    };


    public async uncheckAll(args: { customerUUID: string }): Promise<ShoppingCartDTO[]> {
        const { customerUUID } = args;

        return await this.prisma.$transaction(async (tx) => {
            const { cartId } = await this.getCustomerCartInfo({ customerUUID, tx });

            await tx.shoppingCartItems.updateMany({
                where: { shopping_cart_id: cartId },
                data: { is_checked: false }
            });

            // Invalidar caché
            await this.cacheService.removeData({
                entity: "customer:shopping-cart",
                query: { customerUUID }
            });

            return await this.getShoppingCart({ customerUUID });
        });
    };

    public async clearCart(args: { customerUUID: string }): Promise<void> {
        const { customerUUID } = args;

        await this.prisma.$transaction(async (tx) => {
            const { cartId } = await this.getCustomerCartInfo({ customerUUID, tx });

            // Eliminar todos los items del carrito
            await tx.shoppingCartItems.deleteMany({
                where: { shopping_cart_id: cartId }
            });

            // Invalidar caché
            await this.cacheService.removeData({
                entity: "customer:shopping-cart",
                query: { customerUUID }
            });
        });
    };

};
