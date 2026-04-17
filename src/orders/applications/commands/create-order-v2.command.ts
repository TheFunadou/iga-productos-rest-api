import { OrderRequestFormGuestDTO } from "src/orders/order.dto";
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
    ) { }
};