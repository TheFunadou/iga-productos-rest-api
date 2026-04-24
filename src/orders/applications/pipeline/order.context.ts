import { Prisma } from "@prisma/client";
import { ShoppingCartDTO } from "src/customer/shopping-cart/application/DTO/shopping-cart.dto";
import { ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { OrderRequestFormGuestDTO, OrderValidatedCustomerData } from "src/orders/payment/application/DTO/order.dto";
import { PaymentProviders } from "src/orders/payment/payment.dto";
import { ProductI, ProductListI, ProductVersionI, ProductVersionUnitPriceI, ResolvedOfferI } from "src/product-version/application/pipelines/interfaces/get-cards.interface";
import { CreateShippingInfoI, OrderShoppingCartI } from "./interfaces/order.interface";

export interface OrderContext {
    // Request
    orderUUID: string;
    isGuest: boolean;
    guestForm?: OrderRequestFormGuestDTO;
    customerUUID?: string;
    sessionId: string;
    addressUUID?: string;
    couponCode?: string;
    buyNowItem?: ShoppingCartDTO

    // Customer
    customer?: OrderValidatedCustomerData;
    shipppingAddress?: CreateShippingInfoI

    // Cart
    shoppingCart?: ShoppingCartDTO[];
    productsList?: ProductListI[];

    //versionData
    productData?: ProductI[];
    versionsData?: ProductVersionI[];
    pricesData?: ProductVersionUnitPriceI[];
    orderResume?: ShoppingCartResumeI;
    productVersionOfferMap?: Map<string, ResolvedOfferI>;
    orderId?: string;

    //Build
    orderShoppingCart?: OrderShoppingCartI[];

    // External
    paymentId?: string;
    paymentProvider: PaymentProviders;
    paymentStatus?: string;
    shipmentId?: string;
    frontendUrl: string;
    notificationUrl: string;

    // Control
    sagaStepsCompleted?: string[];
    reservedOfferUsages?: { offerId: string; incrementedBy: number }[];

    //Prisma
    tx: Prisma.TransactionClient;
}