import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateProviderOrderStrategyArgs } from "src/orders/order.dto";
import { buildMercadoPagoOrderItems, buildMercadoPagoPreferenceBody, buildOrderVigency } from "src/orders/helpers/mercadopago.helpers";
import { MercadoPagoProvider } from "src/orders/providers/mercado-pago.provider";


export interface CreateProviderOrderStrategy {
    createOrder(args: CreateProviderOrderStrategyArgs): Promise<{ externalID: string, orderUUID: string }>;
};

@Injectable()
export class MercadoPagoStrategy implements CreateProviderOrderStrategy {
    constructor(
        private readonly mercadoPago: MercadoPagoProvider,
    ) { };
    async createOrder(args: CreateProviderOrderStrategyArgs): Promise<{ externalID: string, orderUUID: string }> {
        const { pvCards, orderItems, customer, customerAddress, shippingCost, frontendUrl, notificationUrl } = args;
        const orderUUID = crypto.randomUUID().toString();
        const items = buildMercadoPagoOrderItems({
            pvCards, currency: "MXN", orderItems
        });
        const vigency = buildOrderVigency();
        const mpPreferenceBody = buildMercadoPagoPreferenceBody({
            customer, customerAddress,
            shippingCost, items,
            frontendUrl, notificationUrl,
            internalOrderId: orderUUID, vigency
        });
        const preference = await this.mercadoPago.create(mpPreferenceBody);
        if (!preference.id) throw new BadRequestException(`Error al crear la preferencia de pago`);
        return { externalID: preference.id, orderUUID };
    };
};

