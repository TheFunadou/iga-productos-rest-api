import { OrderAndPaymentStatus } from "@prisma/client";
import { GetCustomerAddressOrder } from "src/customer/customer-addresses/customer-addresses.dto";
import { ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { OrderCheckoutItemI } from "src/orders/applications/pipeline/interfaces/order.interface";

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
    shipping: GetCustomerAddressOrder;
};

export interface PaymentDetailsI {
    status: OrderAndPaymentStatus;
    order?: OrderDescriptionI;
}