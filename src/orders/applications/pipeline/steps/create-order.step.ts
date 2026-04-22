import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class CreateOrderStep implements OrderPipelineStepI {
    constructor() { };

    async execute(context: OrderContext): Promise<void> {
        const { tx, paymentId, customer, orderUUID, paymentProvider, orderResume, isGuest, sessionId, customerUUID } = context;
        if (!paymentId) throw new BadRequestException("No se encontro la referencia externa de pago");
        if (!orderResume) throw new BadRequestException("No se encontro el resumen de la orden");
        if (!customer) throw new BadRequestException("No se encontro el cliente");
        const { id } = await tx.order.create({
            data: {
                uuid: orderUUID,
                buyer_name: customer.customer.name,
                buyer_surname: customer.customer.last_name,
                buyer_email: customer.customer.email,
                external_order_id: paymentId,
                session_id: customerUUID ? undefined : sessionId,
                customer_id: customer.customer.id,
                payment_provider: paymentProvider,
                status: "IN_PROCESS",
                total_amount: orderResume.total,
                exchange: "MXN",
                is_guest_order: isGuest
            },
            select: { id: true }
        });
        context.orderId = id;
    };
};