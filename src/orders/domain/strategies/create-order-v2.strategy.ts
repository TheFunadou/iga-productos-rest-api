import { BadRequestException, Injectable } from "@nestjs/common";
import { buildMercadoPagoOrderItemsV2, buildMercadoPagoPreferenceBodyV2, buildOrderVigency } from "src/orders/helpers/mercadopago.helpers";
import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";
import { OrderStrategyArgsI } from "src/orders/applications/pipeline/interfaces/order.interface";


export interface CreateProviderOrderStrategy {
    createOrder(args: OrderStrategyArgsI): Promise<{ externalID: string, orderUUID: string }>;
};

@Injectable()
export class MercadoPagoStrategy implements CreateProviderOrderStrategy {
    constructor(
        private readonly mercadoPago: MercadoPagoProvider,
    ) { };
    async createOrder(args: OrderStrategyArgsI): Promise<{ externalID: string, orderUUID: string }> {
        const { orderUUID, orderShoppingCart, validatedCustomer, shippingCost, frontendUrl, notificationUrl } = args;
        const items = buildMercadoPagoOrderItemsV2({
            data: orderShoppingCart, currency: "MXN"
        });
        const vigency = buildOrderVigency();
        const mpPreferenceBody = buildMercadoPagoPreferenceBodyV2({
            customer: validatedCustomer,
            frontendUrl,
            internalOrderUUID: orderUUID,
            items,
            notificationUrl,
            shippingCost,
            vigency
        });
        const preference = await this.mercadoPago.create(mpPreferenceBody);
        if (!preference.id) throw new BadRequestException(`Error al crear la preferencia de pago`);
        return { externalID: preference.id, orderUUID };
    };
};

