import { BadRequestException, Injectable } from "@nestjs/common";
import { PaymentProviders } from "src/orders/payment/payment.dto";
import { CreateProviderOrderStrategy, MercadoPagoStrategy } from "../strategies/create-order-v2.strategy";

@Injectable()
export class CreateOrderStrategyFactory {
    constructor(
        private readonly mercadoPagoStrategy: MercadoPagoStrategy,
    ) { }

    create(provider: PaymentProviders): CreateProviderOrderStrategy {
        switch (provider) {
            case "mercado_pago":
                return this.mercadoPagoStrategy;
            default:
                throw new BadRequestException("Proveedor no soportado");
        }
    }
};