import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductVersionUtilsService } from "./product-version.utils.service";
import { GetProductVersionCards, ProductVersionCardsFiltersDTO, ProductVersionDetail } from "./product-version.dto";
import { OffersUtilsService } from "src/offers/offers.utils.service";
import { CommandBus } from "@nestjs/cqrs";
import { SearchPVCardsCommand } from "./domain/command/search-cards.command";

@Injectable()
export class ProductVersionFindService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly utilsService: ProductVersionUtilsService,
        private readonly offersUtilsService: OffersUtilsService,
        private readonly commandBus: CommandBus
    ) { };

    async searchCards(args: { filters: ProductVersionCardsFiltersDTO, customerUUID?: string, entity?: string, scope: "internal" | "external" }): Promise<GetProductVersionCards | null> {
        const { customerUUID, filters, entity, scope } = args;
        return this.commandBus.execute(
            new SearchPVCardsCommand(
                filters,
                scope,
                customerUUID,
                entity,
            )
        )
    };

    async showDetails(args: { sku: string, customerUUID?: string }): Promise<ProductVersionDetail | null> {
        const builtFilters = this.utilsService.buildShowDetailsFilters({ sku: args.sku, customerUUID: args.customerUUID });
        return await this.cacheService.remember<ProductVersionDetail | null>({
            method: "staleWhileRevalidateWithLock",
            entity: `product-version:show:details${args.customerUUID ? `:${args.customerUUID}` : ""}`,
            query: builtFilters.query,
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 13
            },
            fallback: async () => {

                const result: any = await this.prisma.productVersion.findFirst({
                    where: { sku: args.sku.toUpperCase() },
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

    // async searchCardsBySKUList(args: { tx?: any, skuList: string[], customerUUID?: string, couponCode?: string }): Promise<ProductVersionCard[]> {
    //     const builtSelect = this.utilsService.buildFindCardsSelect({ customerUUID: args.customerUUID });
    //     const results = args.tx ? await args.tx.productVersion.findMany({
    //         where: { sku: { in: args.skuList } },
    //         select: builtSelect
    //     }) : await this.prisma.productVersion.findMany({
    //         where: { sku: { in: args.skuList } },
    //         select: builtSelect
    //     });

    //     const productVersionsData = results.map(r => ({
    //         versionId: r.id,
    //         productId: r.product.id,
    //         categoryId: r.product.category_id,
    //         subcategoryIds: r.product.subcategories.map(s => s.subcategories.uuid)
    //     }));

    //     if (args.couponCode) {
    //         const discountsInfo = await this.offersUtilsService.checkMultipleProductVersionsDiscountsByCoupon({
    //             couponCode: args.couponCode,
    //             productVersions: productVersionsData
    //         });

    //         return this.utilsService.formatCards({ data: results, discountsMap: discountsInfo });
    //     };
    //     const discountsMap = await this.offersUtilsService.checkMultipleProductVersionsDiscounts(productVersionsData);
    //     return this.utilsService.formatCards({ data: results, discountsMap })

    // }
};