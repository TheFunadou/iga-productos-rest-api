import { CreateOrderStrategyFactory } from "src/orders/domain/factories/create-order.factory";
import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class CreatePaymentStep implements OrderPipelineStep {
    constructor(
        private readonly createPaymentFactory: CreateOrderStrategyFactory
    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { orderUUID, paymentProvider, customer, frontendUrl, notificationUrl, orderItems, pvCards, orderResume } = context;
        const createOrderStrategy = this.createPaymentFactory.create(paymentProvider);
        if (!customer) throw new BadRequestException("Error al crear orden, no se encontraron los datos del cliente");
        if (!orderItems || orderItems.length === 0) throw new BadRequestException("Error al crear la order, no se encontraron los articulos a comprar")
        if (!pvCards || pvCards.length === 0) throw new BadRequestException("Error al crear la order, no se encontraron los articulos a comprar")
        if (!orderResume) throw new BadRequestException("Error al crear la orden, no se encontro el resumen de la orden");
        const { externalID } = await createOrderStrategy.createOrder({
            orderUUID,
            customer: {
                email: customer.customer.email,
                last_name: customer.customer.last_name,
                name: customer.customer.name
            },
            customerAddress: customer.customerAddress,
            frontendUrl,
            notificationUrl,
            orderItems,
            pvCards,
            shippingCost: orderResume.shippingCost
        });
        context.paymentId = externalID;
    };
};