import { OrderContext } from "../order.context";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateOrderStrategyFactory } from "src/orders/domain/factories/create-order-v2.factory";

@Injectable()
export class CreatePaymentStep implements OrderPipelineStepI {
    constructor(
        private readonly createPaymentFactory: CreateOrderStrategyFactory
    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { orderUUID, paymentProvider, customer, frontendUrl, notificationUrl, orderShoppingCart, orderResume } = context;
        const createOrderStrategy = this.createPaymentFactory.create(paymentProvider);
        if (!customer) throw new BadRequestException("Error al crear orden, no se encontraron los datos del cliente");
        if (!orderShoppingCart || orderShoppingCart.length === 0) throw new BadRequestException("Error al crear la order, no se encontraron los articulos a comprar")
        if (!orderResume) throw new BadRequestException("Error al crear la orden, no se encontro el resumen de la orden");
        const { externalID } = await createOrderStrategy.createOrder({
            orderUUID,
            frontendUrl,
            notificationUrl,
            orderShoppingCart,
            validatedCustomer: customer,
            shippingCost: orderResume.shippingCost
        });
        context.paymentId = externalID;
    };
};