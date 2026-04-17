import { Prisma } from "@prisma/client";
import { CreateOrderShippingInfo } from "src/customer/customer-addresses/customer-addresses.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { OrderRequestFormGuestDTO, OrderValidatedCustomerData } from "src/orders/order.dto";
import { OrderResume, OrderShoppingCartDTO, PaymentProviders } from "src/orders/payment/payment.dto";
import { ProductVersionCard } from "src/product-version/product-version.dto";

export interface OrderContext {
    // Request
    orderUUID: string;
    isGuest: boolean;
    guestForm?: OrderRequestFormGuestDTO;
    customerUUID?: string;
    addressUUID?: string;
    orderItems: OrderShoppingCartDTO[];
    couponCode?: string;

    // Customer
    customer?: OrderValidatedCustomerData;
    shipppingAddress?: CreateOrderShippingInfo

    // Cart
    pvCards?: ProductVersionCard[];
    shoppingCart?: ShoppingCartDTO[];
    orderResume?: OrderResume;

    orderId?: string;

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