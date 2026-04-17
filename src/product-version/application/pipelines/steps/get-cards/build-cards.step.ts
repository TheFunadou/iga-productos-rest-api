import { ProductVersionCardBuilder, ProductVersionCardDirector } from "../../../builders/product-version-card.builder";
import { BuildCardsContext } from "../../get-cards.context";
import { BuildCardsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BuildCardsStep implements BuildCardsPipelineStep {
    constructor(

    ) { }

    async execute(context: BuildCardsContext): Promise<void> {
        const {
            productsList,
            productEntity,
            productVersionEntity,
            productVersionStockEntity,
            productVersionUnitPriceEntity,
            productVersionOfferMap,
            customerFavorites,
        } = context;

        // Crear mapas de lookup rapido por SKU
        const productByUUID = new Map(
            productEntity.map(p => [p.uuid, p])
        );

        const versionMap = new Map(
            productVersionEntity.map(v => [v.sku, v])
        );

        const unitPriceMap = new Map(
            productVersionUnitPriceEntity.map(up => [up.sku, up])
        );

        const stockMap = new Map(
            productVersionStockEntity.map(s => [s.sku, s])
        );

        // Construir las tarjetas usando el builder pattern
        const builder = new ProductVersionCardBuilder();
        const cards = productsList.flatMap(productItem => {
            const product = productByUUID.get(productItem.productUUID);

            // Skip si no se encuentra el producto
            if (!product) {
                return [];
            }

            return productItem.sku.map(sku => {
                const version = versionMap.get(sku);
                const unitPrice = unitPriceMap.get(sku);
                const offer = productVersionOfferMap?.get(sku);
                const stock = stockMap.get(sku);

                // Skip si faltan datos esenciales
                if (!version || !unitPrice || !stock) {
                    return null;
                }

                return ProductVersionCardDirector.createCard(builder, {
                    product,
                    productVersion: version,
                    unitPrice,
                    stock,
                    offer,
                    customerFavorites
                });
            }).filter((card): card is NonNullable<typeof card> => card !== null);
        });

        // Guardar resultado en el contexto — tipado directamente en BuildCardsContext
        context.cards = cards;
    };
};
