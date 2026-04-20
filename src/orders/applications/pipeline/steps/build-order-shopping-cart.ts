import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { OrderShoppingCartBuilder, OrderShoppingCartDirector } from "../../builders/order-shopping-cart.builder";


@Injectable()
export class BuildOrderShoppingCartStep implements OrderPipelineStepI {
    constructor(

    ) { }

    async execute(context: OrderContext): Promise<void> {
        const {
            productData,
            versionsData,
            pricesData,
            shoppingCart,
            productsList,
            productVersionOfferMap
        } = context;

        if (!productData || productData.length === 0) throw new NotFoundException("No se encontraron los productos");
        if (!versionsData || versionsData.length === 0) throw new NotFoundException("No se encontraron las versiones de los productos");
        if (!pricesData || pricesData.length === 0) throw new NotFoundException("No se encontraron los precios de los productos");
        if (!shoppingCart || shoppingCart.length === 0) throw new NotFoundException("No se encontraron los productos del carrito");
        if (!productsList || productsList.length === 0) throw new NotFoundException("No se encontraron los productos del carrito");

        // Crear mapas de lookup rapido por SKU
        const productByUUID = new Map(productData.map(p => [p.uuid, p]));
        const versionMap = new Map(versionsData.map(v => [v.sku, v]));
        const unitPriceMap = new Map(pricesData.map(up => [up.sku, up]));
        const shoppingCartMap = new Map(shoppingCart.map(s => [s.item.sku, s]));

        // Construir las tarjetas usando el builder pattern
        const builder = new OrderShoppingCartBuilder();
        const orderShoppingCart = productsList.flatMap(productItem => {
            const product = productByUUID.get(productItem.productUUID);

            // Skip si no se encuentra el producto
            if (!product) {
                return [];
            }

            return productItem.sku.map(sku => {
                const version = versionMap.get(sku);
                const unitPrice = unitPriceMap.get(sku);
                const offer = productVersionOfferMap?.get(sku);

                const cartItem = shoppingCartMap.get(sku);
                const quantity = cartItem?.quantity || 0;
                if (!version || !unitPrice) return null;
                return OrderShoppingCartDirector.createCard(builder, {
                    product,
                    productVersion: version,
                    unitPrice,
                    offer,
                    quantity
                });
            }).filter((card): card is NonNullable<typeof card> => card !== null);
        });

        // Guardar resultado en el contexto — tipado directamente en BuildCardsContext
        context.orderShoppingCart = orderShoppingCart;
    };
};
