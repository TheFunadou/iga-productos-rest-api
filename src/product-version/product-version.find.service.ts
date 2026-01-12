import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductVersionUtilsService } from "./product-version.utils.service";
import { GetProductVersionCards, GetProductVersionCardsRandomOptionsDTO, ProductVersionCard, ProductVersionCardsFiltersDTO, ProductVersionDetail } from "./product-version.dto";
import { OffersUtilsService } from "src/offers/offers.utils.service";

@Injectable()
export class ProductVersionFindService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly utilsService: ProductVersionUtilsService,
        private readonly offersUtilsService: OffersUtilsService
    ) { };

    async searchCards(args: { filters: ProductVersionCardsFiltersDTO, customerUUID?: string, entity?: string }): Promise<GetProductVersionCards | null> {
        const builtFilters = await this.utilsService.buildCardsFilters({ tx: this.prisma, filters: args.filters, customerUUID: args.customerUUID });
        if (!builtFilters) return null;
        return await this.cacheService.remember<GetProductVersionCards>({
            method: "staleWhileRevalidateWithLock",
            entity: args.entity ?? "product-version:search:cards",
            query: builtFilters.cacheQuery,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 13
            },
            fallback: async () => {


                const results: any = await this.prisma.productVersion.findMany({
                    ...builtFilters.paginationFilter,
                    ...builtFilters.productVersionFilters,
                    ...builtFilters.priceFilters,
                    select: builtFilters.select
                });

                const productVersionsData = results.map(r => ({
                    versionId: r.id,
                    productId: r.product.id,
                    categoryId: r.product.category_id,
                    subcategoryIds: r.product.subcategories.map(s => s.subcategories.uuid)
                }));

                const discountsMap = await this.offersUtilsService.checkMultipleProductVersionsDiscounts(productVersionsData);

                return {
                    data: this.utilsService.formatCards({ data: results, discountsMap }),
                    totalRecords: builtFilters.totalRows,
                    totalPages: Math.ceil(builtFilters.totalRows / builtFilters.paginationFilter.take)
                }
            }
        })

    };

    async findRandomCards(args: { options: GetProductVersionCardsRandomOptionsDTO, customerUUID?: string }): Promise<ProductVersionCard[]> {
        return await this.utilsService.findRandomCards(args.options, args.customerUUID);
    };

    async showDetails(args: { sku: string, customerUUID?: string }): Promise<ProductVersionDetail | null> {
        const builtFilters = this.utilsService.buildShowDetailsFilters({ sku: args.sku, customerUUID: args.customerUUID });
        return await this.cacheService.remember<ProductVersionDetail | null>({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:show:details",
            query: builtFilters.query,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 13
            },
            fallback: async () => {

                const result: any = await this.prisma.productVersion.findFirst({
                    where: { sku: { contains: args.sku, mode: "insensitive" } },
                    select: builtFilters.select
                });
                if (!result) return null;

                const discountInfo = await this.offersUtilsService.checkSingleProductVersionDiscount({
                    versionId: result.id,
                    productId: result.product.id,
                    categoryId: result.product.category_id,
                    subcategoryIds: result.product.subcategories.map(s => s.subcategories.uuid)
                });

                return this.utilsService.formatDetail({
                    version: result,
                    discount: discountInfo.discount,
                    isOffer: discountInfo.isOffer
                });
            }
        })
    };

    async searchCardsBySKUList(args: { tx?: any, skuList: string[], customerUUID?: string }) {
        const builtSelect = this.utilsService.buildFindCardsSelect({ customerUUID: args.customerUUID });
        const results = args.tx ? await args.tx.productVersion.findMany({
            where: { sku: { in: args.skuList } },
            select: builtSelect
        }) : await this.prisma.productVersion.findMany({
            where: { sku: { in: args.skuList } },
            select: builtSelect
        });
        return this.utilsService.formatCards(results);
    }
};