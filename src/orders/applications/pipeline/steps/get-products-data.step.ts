import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderContext } from "../order.context";
import { AggregateCardEntitiesService } from "src/product-version/domain/services/search-cards/aggregate-entities.service";
import { AggregateOfferEntitiesService } from "src/offers/domain/services/aggregate-offer-entities.service";
import { OfferLookupInputI, ProductI, ProductVersionI } from "src/product-version/application/pipelines/interfaces/get-cards.interface";

@Injectable()
export class GetProductsDataStep implements OrderPipelineStepI {
    constructor(
        private readonly aggDataFinder: AggregateCardEntitiesService,
        private readonly aggOffer: AggregateOfferEntitiesService,
    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { shoppingCart } = context;
        if (!shoppingCart || shoppingCart.length === 0) throw new NotFoundException("No se encontro el carrito de compras");
        const productUUIDs = shoppingCart.flatMap(s => s.item.productUUID);
        const skuList = shoppingCart.flatMap(s => s.item.sku);
        const map = new Map<string, string[]>();
        for (const { item: { productUUID, sku } } of shoppingCart) {
            if (!map.has(productUUID)) {
                map.set(productUUID, []);
            }
            map.get(productUUID)!.push(sku);
        };

        const productsList = Array.from(map, ([productUUID, sku]) => ({
            productUUID,
            sku
        }));
        context.productsList = productsList;

        const [productsData, versionsData, pricesData] = await Promise.all([
            this.aggDataFinder.aggregateProducts({ productUUIDs }),
            this.aggDataFinder.aggregateProductVersions({ skuList }),
            this.aggDataFinder.aggregateProductVersionPrices({ skuList }),
        ]);
        context.productData = productsData;
        context.versionsData = versionsData;
        context.pricesData = pricesData;

        // Fase 2 — ofertas (secuencial: necesita los IDs de DB de las entidades ya hydratadas)
        // Índice de producto por UUID para el cruce rápido
        const productIndex = new Map<string, ProductI>(productsData.map(p => [p.uuid, p]));
        // Índice de versión por SKU para obtener el id de DB de la versión
        const versionIndex = new Map<string, ProductVersionI>(versionsData.map(v => [v.sku, v]));

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