import { ProductVersionCardI } from "src/product-version/application/pipelines/interfaces/product-version-card.interface";
import { ShoppingCartDTO } from "./application/DTO/shopping-cart.dto";
import { ShoppingCartItemsResumeI } from "./application/interfaces/shopping-cart.interface";


export const toShoppingCartItemsResumeI = ({ shoppingCart, cards }: { shoppingCart: ShoppingCartDTO[], cards: ProductVersionCardI[] }): ShoppingCartItemsResumeI[] => {
    return shoppingCart.reduce((acc, sc) => {
        if (!sc.isChecked) return acc;

        const data = cards.find(card => card.sku === sc.item.sku);
        if (!data) return acc;

        acc.push({
            sku: sc.item.sku,
            quantity: sc.quantity,
            unitPrice: data.unitPrice,
            finalPrice: data.finalPrice,
            isOffer: data.offer.isOffer
        });

        return acc;
    }, [] as ShoppingCartItemsResumeI[]);

};