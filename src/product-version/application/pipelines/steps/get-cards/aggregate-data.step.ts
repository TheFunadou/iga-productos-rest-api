import { AggregateCardEntitiesService } from "src/product-version/domain/services/search-cards/aggregate-entities.service";
import { AggregateOfferEntitiesService } from "src/offers/domain/services/aggregate-offer-entities.service";
import { BuildCardsContext } from "../../get-cards.context";
import { BuildCardsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { FavoritesService } from "src/customer/favorites/favorites.service";
import { OfferLookupInputI, ProductI, ProductVersionI } from "../../interfaces/get-cards.interface";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AggregateDataStep implements BuildCardsPipelineStep {
    constructor(
        private readonly aggCard: AggregateCardEntitiesService,
        private readonly aggOffer: AggregateOfferEntitiesService,
        private readonly favorites: FavoritesService
    ) { };

    async execute(context: BuildCardsContext): Promise<void> {
        const { productsList, customerUUID } = context;

        if (!productsList.length) {
            context.stopPipeline = true;
            return;
        };

        const productUUIDs = productsList.map(p => p.productUUID);
        const skuList = productsList.flatMap(p => p.sku);

        // Fase 1 — entidades base en paralelo (independientes entre sí)
        const [products, productVersions, productVersionStock, productVersionUnitPrice, customerFavorites] = await Promise.all([
            this.aggCard.aggregateProducts({ productUUIDs }),
            this.aggCard.aggregateProductVersions({ skuList }),
            this.aggCard.aggregateProductVersionStock({ skuList }),
            this.aggCard.aggregateProductVersionPrices({ skuList }),
            this.favorites.favoritesList({ customerUUID })
        ]);

        context.productEntity = products;
        context.productVersionEntity = productVersions;
        context.productVersionStockEntity = productVersionStock;
        context.productVersionUnitPriceEntity = productVersionUnitPrice;
        context.customerFavorites = customerFavorites;

        // Fase 2 — ofertas (secuencial: necesita los IDs de DB de las entidades ya hydratadas)
        // Índice de producto por UUID para el cruce rápido
        const productIndex = new Map<string, ProductI>(products.map(p => [p.uuid, p]));

        // Índice de versión por SKU para obtener el id de DB de la versión
        const versionIndex = new Map<string, ProductVersionI>(productVersions.map(v => [v.sku, v]));

        // Construir OfferLookupInputI[] cruzando productsList → productEntity → productVersionEntity
        const offerInputs: OfferLookupInputI[] = productsList.flatMap(entry => {
            const product = productIndex.get(entry.productUUID);

            // Si el producto no está hydratado (miss total en cache y DB) lo saltamos
            if (!product) return [];

            return entry.sku.flatMap(sku => {
                const version = versionIndex.get(sku);

                // Si la versión no está hydratada la saltamos
                if (!version) return [];

                return [{
                    sku,
                    versionId: version.id,
                    productId: product.id,
                    categoryId: product.category.id,
                    subcategoryIds: product.subcategories.map(s => s.uuid),
                }] satisfies OfferLookupInputI[];
            });
        });

        context.productVersionOfferMap = await this.aggOffer.aggregateProductVersionOffers(offerInputs);
    };
};