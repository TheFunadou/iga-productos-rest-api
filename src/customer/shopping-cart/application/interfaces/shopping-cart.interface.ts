import { ProductVersionCardI } from "src/product-version/application/pipelines/interfaces/product-version-card.interface"
import { ShoppingCartDTO } from "../DTO/shopping-cart.dto"

export interface ShoppingCartClientI {
    uuid: string,
    target: "client" | "session"
};

export interface ShoppingCartQueryI { clientUUID: string };


export interface LoadShoppingCartI {
    cards: ProductVersionCardI[]
    shoppingCart: ShoppingCartDTO[]
    resume?: ShoppingCartResumeI
};


export interface ShoppingCartItemsResumeI {
    sku: string;
    quantity: number;
    unitPrice: string;
    finalPrice: string;
    isOffer: boolean;
};

export interface ShoppingCartResumeI {
    itemsSubtotal: string;
    itemsSubtotalBeforeTaxes: string;
    shippingCost: string;
    shippingCostBeforeTaxes: string;
    boxesCount: number;
    iva: string;
    subtotal: string;
    discount: string;
    total: string;
};



