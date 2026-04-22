import { ShoppingCartDTO } from "src/customer/shopping-cart/application/DTO/shopping-cart.dto";
import { OrderRequestFormGuestDTO } from "src/orders/payment/application/DTO/order.dto";
import { PaymentProviders } from "src/orders/payment/payment.dto";

export class CreateOrderCommand {
    constructor(
        public readonly frontendUrl: string,
        public readonly notificationUrl: string,
        public readonly paymentProvider: PaymentProviders,
        public readonly sessionId: string,
        public readonly customerUUID?: string,
        public readonly addressUUID?: string,
        public readonly couponCode?: string,
        public readonly guestForm?: OrderRequestFormGuestDTO,
        public readonly buyNowItem?: ShoppingCartDTO
    ) { }
};