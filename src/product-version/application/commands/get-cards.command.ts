import { ProductVersionCardsFiltersDTO } from "src/product-version/product-version.dto";

export class GetCardsCommand {
    constructor(
        public readonly customerUUID: string | undefined,
        public readonly scope: "internal" | "external",
        public readonly filters?: ProductVersionCardsFiltersDTO,
        public readonly productsList?: { productUUID: string, sku: string[] }[],
    ) { }
}
