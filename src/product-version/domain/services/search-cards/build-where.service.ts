import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PRODUCT_VERSION_CARD_BASE_SELECT } from "src/product-version/helpers";
import { SearchCardsCacheQuery, ProductVersionCardsFiltersDTO as SearchCardsFiltersDTO } from "src/product-version/product-version.dto";
import { CardsWhereBuilder, CardsWhereDirector } from "src/product-version/application/builders/cards-where.builder";



@Injectable()
export class SearchCardsBuildWhereService {
    private readonly MAX_CARDS_LIMIT = 20;
    constructor() { };

    buildCacheEntity({ entity }: { entity?: string }): string {
        const aditionalValue = entity ? `:${entity}` : "";
        return `cards:query:${aditionalValue}`
    };

    buildCacheQuery(args: { filters: SearchCardsFiltersDTO, scope: "internal" | "external" }): SearchCardsCacheQuery {
        const { filters, scope } = args;
        return { filters, scope }
    };

    buildPagination(args: { filters: SearchCardsFiltersDTO, scope: "internal" | "external" }): { take: number, skip: number } {
        const { filters: { page: pageFilter, limit: limitFilter }, scope } = args;
        if (scope === "external" && limitFilter && limitFilter > this.MAX_CARDS_LIMIT) throw new BadRequestException("Ingresa un limite menos grande");
        const take = limitFilter ? limitFilter : 15;
        const page = pageFilter && pageFilter > 0 ? (pageFilter - 1) : 0;
        const skip = page * take;
        return { take, skip };
    };

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

    private async getSubcategoriesIds({ tx, subcategories }: { tx: Prisma.TransactionClient, subcategories: string[] }) {
        return await tx.subcategories.findMany({
            where: { uuid: { in: subcategories } }, select: { id: true }
        });
    };


    async buildWhere(args: {
        tx: Prisma.TransactionClient;
        filters: SearchCardsFiltersDTO;
        customerUUID?: string;
        verifiedLimit: number;
    }): Promise<{ where: Prisma.ProductVersionWhereInput }> {
        const { tx, filters, customerUUID, verifiedLimit } = args;

        /*
        const where: Prisma.ProductVersionWhereInput = {};
        if (filters.category) where.product = { category: { name: { equals: filters.category, mode: "insensitive" } } };
        if (filters.subcategoryPath?.length) {
            if (!filters.category) throw new BadRequestException("Se necesita proveer una categoria principal");
            const subcategoriesPathIds = await this.getSubcategoriesIds({ tx, subcategories: filters.subcategoryPath });
            where.product = {
                AND: subcategoriesPathIds.map(sub => ({
                    subcategories: { some: { subcategory_id: sub.id } }
                }))
            };
        };
        if (filters.onlyFavorites && customerUUID) {
            where.customer_favorites = { some: { customer: { uuid: customerUUID } } }
        };
        if (filters.random) {
            if (filters.skuList && filters.skuList.length > 0) throw new BadRequestException("Los parametros random y skuList son incompatibles entre si para realizar esta operación.");
            const randomSKU = await this.getRandomSKU({ tx, limit: verifiedLimit });
            where.sku = { in: randomSKU };
        };

        if (filters.skuList) {
            if (filters.random) throw new BadRequestException("Los parametros random y skuList son incompatibles entre si para realizar esta operación.");
            where.sku = { in: filters.skuList };
        };
        */

        const where = await CardsWhereDirector.createWhere(
            new CardsWhereBuilder(),
            { ...filters, limit: verifiedLimit }, // Usamos verifiedLimit calculado en el servicio
            tx,
            customerUUID
        );

        return { where };
    }


    buildOrderBy({ filters }: { filters: SearchCardsFiltersDTO }): Prisma.ProductVersionOrderByWithRelationInput[] {
        const { moreExpensive } = filters;

        // Determinamos si es una consulta "limpia" (sin filtros específicos de categoría o búsqueda)
        const isStandardQuery = !filters.category && !filters.subcategoryPath && !filters.skuList && !filters.onlyFavorites;

        const basePriceOrder: Prisma.ProductVersionOrderByWithRelationInput = moreExpensive ? { unit_price: "desc" } : { unit_price: "asc" };

        if (isStandardQuery) {
            return [
                // 1. Prioridad de Categoría: Cascos se posicionará en su lugar alfabético estable
                { product: { category: { priority: 'asc' } } },

                // 2. Orden por Familia/Producto: Esto agrupa las subcategorías (Coraza, Hit, Plagosur)
                { product: { product_name: 'asc' } },

                // 3. Criterio de Precio solicitado
                basePriceOrder,

                // 4. "Sal" para mezclar colores: Al ordenar por SKU (y no por color_name), 
                // rompemos la tendencia de la base de datos de agrupar colores idénticos alfabéticamente.
                { sku: 'desc' }
            ];
        }

        // Si hay filtros específicos, mantenemos la lógica simple de precio
        return [basePriceOrder];
    };


    buildSelect({ customerUUID }: { customerUUID?: string }): Prisma.ProductVersionSelect {
        const select: Prisma.ProductVersionSelect = {
            ...PRODUCT_VERSION_CARD_BASE_SELECT,
        };
        customerUUID ? select.customer_favorites = {
            where: { customer: { uuid: customerUUID } },
            select: { added_at: true }
        } : undefined
        return select;
    };

    async countRecords({ tx, where }: { tx: Prisma.TransactionClient, where: Prisma.ProductVersionWhereInput }) {
        const totalRecords = await tx.productVersion.count({ where });
        if (totalRecords === 0) return null;
        return totalRecords;
    };

};