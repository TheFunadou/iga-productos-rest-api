import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { CreateOrderShippingInfo } from "src/customer/customer-addresses/customer-addresses.dto";
import { OrderRequestFormGuestDTO } from "src/orders/order.dto";
import { buildValidatedAuthCustomerData, buildValidatedGuestCustomerData } from "src/orders/orders.helpers";

@Injectable()
export class ValidateCustomerStep implements OrderPipelineStep {
    constructor(
        private readonly cache: CacheService
    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { tx, customerUUID, addressUUID, guestForm, isGuest, orderUUID } = context;
        if (isGuest) {
            if (!guestForm) throw new BadRequestException("Error al crear orden de pago, no se encontro el formulario del invitado.")
            const hasAccount = await tx.customer.findFirst({ where: { email: guestForm.email } });
            if (hasAccount) throw new BadRequestException("Este correo ya tiene una cuenta activa, inicia sesión para continuar con tu compra");
            await this.cache.setData<OrderRequestFormGuestDTO>({
                entity: "order:guest:data",
                query: { orderUUID },
                data: guestForm,
                aditionalOptions: {
                    ttlMilliseconds: 1000 * 60 * 15
                },
            });
            const validatedData = buildValidatedGuestCustomerData({ guestForm });
            context.customer = validatedData;
            const { first_name, last_name, consent, ...shippingInfo } = guestForm;
            const shippingAddress: CreateOrderShippingInfo = shippingInfo
            context.shipppingAddress = shippingAddress;
            return;
        };

        if (!customerUUID || !addressUUID) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        const customerData = await tx.customer.findUnique({
            where: { uuid: customerUUID },
            select: {
                id: true, name: true,
                last_name: true, email: true
            }
        });
        const addressData = await tx.customerAddresses.findUnique({
            where: { uuid: addressUUID },
            omit: {
                created_at: true,
                updated_at: true,
                uuid: true,
                customer_id: true,
                default_address: true
            }
        });

        if (!customerData || !addressData) throw new BadRequestException("Error al crear orden de pago, no se encotraron los datos del cliente");
        const customerAddressData = {
            id: addressData.id,
            zip_code: addressData.zip_code,
            street_name: addressData.street_name,
            city: addressData.city,
            state: addressData.state,
            number: addressData.number,
            country: addressData.country
        }
        const validatedData = buildValidatedAuthCustomerData({ customerAddressData, customerData });
        context.customer = validatedData;
        const { id, ...shippingData } = addressData;
        const shippingAddress: CreateOrderShippingInfo = shippingData
        context.shipppingAddress = shippingAddress;
        return;
    }
};