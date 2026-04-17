import { Prisma } from "@prisma/client";
import { CreateOrderShippingInfo } from "src/customer/customer-addresses/customer-addresses.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/application/DTO/shopping-cart.dto";
import { ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { OrderRequestFormGuestDTO, OrderValidatedCustomerData } from "src/orders/order.dto";
import { OrderResume, PaymentProviders } from "src/orders/payment/payment.dto";
import { ProductI, ProductListI, ProductVersionI, ProductVersionOfferI, ProductVersionStockI, ProductVersionUnitPriceI, ResolvedOfferI } from "src/product-version/application/pipelines/interfaces/get-cards.interface";
import { OrderShoppingCartI } from "./interfaces/order.interface";

export interface OrderContext {
    // Request
    orderUUID: string;
    isGuest: boolean;
    guestForm?: OrderRequestFormGuestDTO;
    customerUUID?: string;
    sessionId: string;
    addressUUID?: string;
    couponCode?: string;

    // Customer
    customer?: OrderValidatedCustomerData;
    shipppingAddress?: CreateOrderShippingInfo

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

    //Prisma
    tx: Prisma.TransactionClient;
}