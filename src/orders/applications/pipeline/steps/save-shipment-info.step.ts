import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class SaveShipmentInfoStep implements OrderPipelineStepI {
    constructor() { };


    async execute(context: OrderContext): Promise<void> {
        const { tx, orderId, shipppingAddress } = context;
        if (!orderId) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        if (!shipppingAddress) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        const shippingInfoCount = await tx.orderShippingInfo.count({ where: { order_id: orderId } });
        let shippingInfoLabel: string;
        if (shippingInfoCount === 0) shippingInfoLabel = "envio-1";
        else shippingInfoLabel = `envio-${shippingInfoCount + 1}`;
        await tx.orderShippingInfo.create({
            data: {
                order_id: orderId,
                address_type: shipppingAddress.addressType,
                recipient_name: shipppingAddress.recipientName,
                recipient_last_name: shipppingAddress.recipientLastName,
                zip_code: shipppingAddress.zipCode,
                street_name: shipppingAddress.streetName,
                city: shipppingAddress.city,
                state: shipppingAddress.state,
                number: shipppingAddress.number,
                country: shipppingAddress.country,
                contact_number: shipppingAddress.contactNumber,
                country_phone_code: shipppingAddress.countryPhoneCode,
                locality: shipppingAddress.locality,
                neighborhood: shipppingAddress.neighborhood,
                aditional_number: shipppingAddress.aditionalNumber,
                floor: shipppingAddress.floor,
                references_or_comments: shipppingAddress.referencesOrComments,
                label: "envio-1"
            }
        });
    };
}; 4