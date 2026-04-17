import { ProductVersionCardsFiltersDTO, SearchCardsCacheQuery } from "src/product-version/product-version.dto";
import { OfferI, ProductI, ProductVersionI, ProductVersionStockI, ProductVersionUnitPriceI, ResolvedOfferI } from "./interfaces/get-cards.interface";
import { ProductVersionCardI } from "./interfaces/product-version-card.interface";
import { Prisma } from "@prisma/client";


export interface BuildCardsContext {
    // Init context
    scope: "internal" | "external";
    queryParams?: ProductVersionCardsFiltersDTO;
    customerUUID?: string;
    entityNameSpace?: string;
    isClient: boolean;
    cacheEntity?: string;
    cacheQuery?: SearchCardsCacheQuery;
    pagination?: { take: number, skip: number };
    where?: Prisma.ProductVersionWhereInput;
    orderBy?: Prisma.ProductVersionOrderByWithRelationInput[];
    totalPages?: number | null;
    totalRecords?: number | null;
    productsList: { productUUID: string, sku: string[] }[];
    productEntity: ProductI[];
    productVersionEntity: ProductVersionI[];
    productVersionStockEntity: ProductVersionStockI[];
    productVersionUnitPriceEntity: ProductVersionUnitPriceI[];
    offerEntity: OfferI[];
    productVersionOfferMap: Map<string, ResolvedOfferI>;
    customerFavorites: string[];

    // Resultado final construido por BuildCardsStep
    cards: ProductVersionCardI[];

    stopPipeline: boolean;

};