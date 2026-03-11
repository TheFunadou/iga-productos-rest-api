import { ProductVersionCardsFiltersDTO as SearchCardsFiltersDTO } from "src/product-version/product-version.dto";


export class SearchPVCardsCommand {
    constructor(
        public readonly filters: SearchCardsFiltersDTO,
        public readonly scope: "internal" | "external",
        public readonly customerUUID?: string,
        public readonly entity?: string,
    ) { };
};