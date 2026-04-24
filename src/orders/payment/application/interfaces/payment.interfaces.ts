import { OrderAndPaymentStatus } from "@prisma/client";
import { ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { OrderCheckoutItemI, ShippingInfoI } from "src/orders/applications/pipeline/interfaces/order.interface";
import { ExtendedShippingI } from "src/shipping/application/interfaces/shipping.interfaces";

export interface PaymentDescriptionI {
    createdAt: Date;
    updatedAt: Date;
    lastFourDigits: string;
    paymentClass: string;
    paymentMethod: string;
    paidAmount: string;
    installments: number;
    paymentStatus: OrderAndPaymentStatus
};

export interface OrderDescriptionI {
    orderUUID: string;
    status: OrderAndPaymentStatus;
    isGuestOrder: boolean;
    paymentProvider: string;
    buyer: { name: string, surname: string, email: string, phone?: string | null };
    totalAmount: string;
    exchange: "MXN" | "USD",
    aditionalResourceUrl?: string | null;
    couponCode?: string | null;
    createdAt: Date;
    updatedAt: Date;
    paymentDetails: PaymentDescriptionI[];
    items: OrderCheckoutItemI[];
    paymentResume: ShoppingCartResumeI;
    shipping: ShippingInfoI[];
};

export interface PaymentDetailsI {
    status: OrderAndPaymentStatus;
    order?: OrderDescriptionI;
};


export interface PaymentDetailsExtendedI {
    order: OrderDescriptionI;
    shippings: ExtendedShippingI[];
}