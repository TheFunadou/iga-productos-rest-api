// src/product-version/application/pipelines/get-details.context.ts
import { ProductI, ProductVersionI, ResolvedOfferI } from "./interfaces/get-cards.interface";
import { ProductVersionDetailsI } from "./interfaces/get-details.interface";

export interface BuildDetailsContext {
    sku: string;
    customerUUID?: string;

    // Base entities (Phase 1)
    productEntity?: ProductI;
    productVersionEntity?: ProductVersionI;

    // Hydration entities (Phase 2)
    stockEntities?: Map<string, number>;
    priceEntities?: Map<string, string>;
    offerMap?: Map<string, ResolvedOfferI>;
    isReviewed?: boolean;

    customerFavorites?: string[];

    // Result
    finalDetails?: ProductVersionDetailsI;
    stopPipeline: boolean;
}
