import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OffersUtilsService } from "src/offers/offers.utils.service";
import { PRODUCT_VERSION_CARD_BASE_SELECT } from "src/product-version/helpers";
import { SearchCardsCacheQuery, ProductVersionCardsFiltersDTO as SearchCardsFiltersDTO } from "src/product-version/product-version.dto";

@Injectable()
export class SearchCardsService {
    private readonly MAX_CARDS_LIMIT = 20;
    constructor(
        private readonly offerUtils: OffersUtilsService,
    ) { };

    buildCacheEntity({ customerUUID, entity }: { customerUUID?: string, entity?: string }): string {
        const aditionalValue = entity ? `:${entity}` : "";
        return customerUUID ? `product-version:search:cards:${customerUUID}${aditionalValue}` : `product-version:search:cards:public:${aditionalValue}`
    };

    buildCacheQuery({ filters, customerUUID, scope }: { filters: SearchCardsFiltersDTO, customerUUID?: string, scope: "internal" | "external" }): SearchCardsCacheQuery {
        return customerUUID ? { filters, customerUUID, scope } : { filters, scope }
    };

    buildPagination({ filters: { page: pageFilter, limit: limitFilter }, scope }: { filters: SearchCardsFiltersDTO, scope: "internal" | "external" }): { take: number, skip: number } {
        if (scope === "external" && limitFilter && limitFilter > this.MAX_CARDS_LIMIT) throw new BadRequestException("Ingresa un limite menos grande");
        const take = limitFilter ? limitFilter : 15;
        const page = pageFilter && pageFilter > 0 ? (pageFilter - 1) : 0;
        const skip = page * take;
        return { take, skip };
    };

    private async getRandomSKU({ tx, limit }: { tx: Prisma.TransactionClient, limit: number }): Promise<string[]> {
        const list = await tx.$queryRaw<{ sku: string }[]>`
        SELECT sku FROM "product_version" ORDER BY RANDOM() LIMIT ${limit};
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

        return { where };
    }

    buildOrderBy({ filters: { moreExpensive } }: { filters: SearchCardsFiltersDTO }): Prisma.ProductVersionOrderByWithRelationInput {
        return moreExpensive ? { unit_price: "desc" } : { unit_price: "asc" }
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

    async searchDiscounts({ data, couponCode }: { data: any[], couponCode?: string }) {
        const productVersionsData = data.map(r => ({
            versionId: r.id,
            productId: r.product.id,
            categoryId: r.product.category_id,
            subcategoryIds: r.product.subcategories.map(s => s.subcategories.uuid)
        }));

        if (couponCode) {
            return await this.offerUtils.checkMultipleProductVersionsDiscountsByCoupon({ couponCode, productVersions: productVersionsData });
        }

        return await this.offerUtils.checkMultipleProductVersionsDiscounts(productVersionsData);
    };



};