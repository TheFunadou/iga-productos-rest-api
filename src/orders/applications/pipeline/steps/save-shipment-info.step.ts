import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class SaveShipmentInfoStep implements OrderPipelineStep {
    constructor() { };


    async execute(context: OrderContext): Promise<void> {
        const { tx, orderId, shipppingAddress } = context;
        if (!orderId) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        if (!shipppingAddress) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        await tx.orderShippingInfo.create({
            data: {
                order_id: orderId,
                ...shipppingAddress
            }
        });
    };
};