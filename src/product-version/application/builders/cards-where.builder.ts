import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { colorLine, ProductVersionCardsFiltersDTO } from "src/product-version/product-version.dto";

export class CardsWhereBuilder {
    private where: Prisma.ProductVersionWhereInput = {};

    private async getRandomSKU({ tx, limit }: { tx: Prisma.TransactionClient, limit: number }): Promise<string[]> {
        const list = await tx.$queryRaw<{ sku: string }[]>`
            SELECT pv.sku
            FROM "product_version" pv
            JOIN "product" p ON p.id = pv.product_id
            JOIN "category" c ON c.id = p.category_id
            ORDER BY c.priority ASC, RANDOM()
            LIMIT ${limit};
            `;
        return list.map(arr => arr.sku);
    };

    withCategory({ categoryName }: { categoryName?: string }): this {
        if (!categoryName) return this;
        this.where.product = {
            ...(this.where.product as object),
            category: { name: { equals: categoryName, mode: "insensitive" } }
        };
        return this;
    };

    withSubcategories({ subcategories }: { subcategories?: string[] }): this {
        if (!subcategories || subcategories.length === 0) return this;
        // En e-commerce suele preferirse 'in' (que tenga cualquiera de estas)
        this.where.product = {
            ...(this.where.product as object),
            subcategories: {
                some: {
                    subcategories: {
                        uuid: { in: subcategories }
                    }
                }
            }
        };
        return this;
    };

    withFavorites({ customerUUID, isEnabled }: { customerUUID?: string, isEnabled?: boolean }): this {
        // Solo aplicamos si se pidió explícitamente y tenemos al cliente
        if (!isEnabled || !customerUUID) return this;

        this.where.customer_favorites = { some: { customer: { uuid: customerUUID } } };
        return this;
    };

    withInStock({ inStock }: { inStock?: boolean }): this {
        if (!inStock) return this;
        this.where.stock = { gt: 0 };
        return this;
    };

    withColorLine({ colorLine }: { colorLine?: colorLine }): this {
        if (!colorLine) return this;
        this.where.color_line = { equals: colorLine, mode: "insensitive" };
        return this;
    };

    withPriceRange({ minPrice, maxPrice }: { minPrice?: number, maxPrice?: number }): this {
        if (minPrice === undefined && maxPrice === undefined) return this;
        this.where.unit_price = {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice })
        };
        return this;
    };

    withSKUList({ skuList, random }: { skuList?: string[], random?: boolean }): this {
        if (!skuList || skuList.length === 0) return this;
        if (random) throw new BadRequestException("No puedes usar filtrado por SKU y Aleatorio al mismo tiempo");
        this.where.sku = { in: skuList };
        return this;
    };

    withRatingRange({ ratingRange }: { ratingRange?: number }): this {
        if (!ratingRange) return this;
        this.where.product = {
            ...(this.where.product as object),
            reviews: { some: { rating: { gte: ratingRange } } }
        };
        return this;
    };

    async withRandom({ random, tx, limit, hasSKUList }: { random?: boolean, tx: Prisma.TransactionClient, limit?: number, hasSKUList?: boolean }): Promise<this> {
        if (!random) return this;
        if (hasSKUList) throw new BadRequestException("No puedes usar filtrado por SKU y Aleatorio al mismo tiempo");

        const skus = await this.getRandomSKU({ tx, limit: limit || 15 });
        this.where.sku = { in: skus };
        return this;
    };

    build(): Prisma.ProductVersionWhereInput {
        return this.where;
    };
};

export class CardsWhereDirector {
    static async createWhere(
        builder: CardsWhereBuilder,
        opts: ProductVersionCardsFiltersDTO,
        tx: Prisma.TransactionClient,
        customerUUID?: string
    ): Promise<Prisma.ProductVersionWhereInput> {
        // 1. Ejecutamos todos los métodos síncronos
        builder.withCategory({ categoryName: opts.category })
            .withSubcategories({ subcategories: opts.subcategoryPath })
            .withFavorites({ customerUUID, isEnabled: opts.onlyFavorites })
            .withInStock({ inStock: opts.onlyInStock })
            .withColorLine({ colorLine: opts.colorLine })
            .withPriceRange({ minPrice: opts.priceRange?.min, maxPrice: opts.priceRange?.max })
            .withSKUList({ skuList: opts.skuList, random: opts.random });

        // 2. Esperamos el método asíncrono
        await builder.withRandom({
            random: opts.random,
            tx,
            limit: opts.limit,
            hasSKUList: !!(opts.skuList && opts.skuList.length > 0)
        });

        return builder.build();
    }
};
