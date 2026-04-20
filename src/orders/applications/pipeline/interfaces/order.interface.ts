import { OrderValidatedCustomerData } from "src/orders/order.dto";
import { Items as MercadoPagoItems } from "mercadopago/dist/clients/commonTypes";
import { ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { GetCustomerAddressOrder } from "src/customer/customer-addresses/customer-addresses.dto";

export interface OrderShoppingCartI {
    versionId: string;
    productUUID: string;
    sku: string;
    imageUrl: string;
    subcategories: string[];
    productName: string;
    category: string;
    unitPrice: string;
    finalPrice: string;
    quantity: number;
    offer: { isOffer: boolean, discount: number, offerIds: string[] };
    subtotal: string;
};

export interface OrderCheckoutItemI {
    name: string;
    category: string;
    subcategories: { uuid: string, name: string }[];
    sku: string;
    color: { line: string, name: string, code: string };
    unitPrice: string;
    finalPrice: string;
    quantity: number;
    offer: { isOffer: boolean, discount: number };
    subtotal: string;
    images: { url: string, mainImage: boolean }[];
};

export interface CheckoutOrderI {
    orderUUID: string;
    items: OrderCheckoutItemI[];
    resume: ShoppingCartResumeI;
    couponCode: string | null;
    externalId: string;
    shippingAddress: GetCustomerAddressOrder;
};

export interface OrderStrategyArgsI {
    orderUUID: string;
    orderShoppingCart: OrderShoppingCartI[],
    validatedCustomer: OrderValidatedCustomerData;
    shippingCost: string;
    frontendUrl: string;
    notificationUrl: string;
};


export interface MercadoPagoPreferenceBodyI {
    items: MercadoPagoItems[];
    internalOrderUUID: string;
    vigency: { expirationFrom: string, expirationTo: string };
    customer: OrderValidatedCustomerData;
    shippingCost: string;
    frontendUrl: string;
    notificationUrl: string;
}