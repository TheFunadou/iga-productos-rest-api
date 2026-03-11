
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { MercadoPagoPreferenceBody, OrderRequestFormGuestDTO, OrderValidatedCustomerData } from "../order.dto";
import { ProductVersionCard } from "src/product-version/product-version.dto";
import { Items as MercadoPagoItems } from "mercadopago/dist/clients/commonTypes";
import { OrderShoppingCartDTO } from "../payment/payment.dto";

export const buildMercadoPagoOrderItems = (args: {
    pvCards: ProductVersionCard[],
    orderItems: OrderShoppingCartDTO[],
    currency: "MXN" | "USD"
}): MercadoPagoItems[] => {
    return args.pvCards.map((item) => ({
        id: item.product_version.sku,
        title: item.product_name,
        description: item.subcategories.join(","),
        picture_url: item.product_images[0].image_url,
        category_id: item.category,
        quantity: args.orderItems.find(qty => qty.product === item.product_version.sku)?.quantity!,
        currency_id: args.currency,
        unit_price: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) : parseFloat(item.product_version.unit_price!.toString())
    }));
};

export const buildMercadoPagoPreferenceBody = (args: MercadoPagoPreferenceBody
): PreferenceCreateData => {
    return {
        body: {
            items: args.items,
            payer: {
                email: args.customer.email,
                name: args.customer.name,
                surname: args.customer.last_name,
            },
            back_urls: {
                success: new URL("pagar-productos/pago-exitoso", args.frontendUrl).href,
                failure: new URL("pagar-productos/pago-fallido", args.frontendUrl).href,
                pending: new URL("pagar-productos/pago-pendiente", args.frontendUrl).href
            },
            shipments: {
                cost: args.shippingCost,
                receiver_address: {
                    zip_code: args.customerAddress.zip_code,
                    street_name: args.customerAddress.street_name,
                    city_name: args.customerAddress.city,
                    state_name: args.customerAddress.state,
                    street_number: args.customerAddress.number,
                    country_name: args.customerAddress.country,
                },
            },
            additional_info: "Información adicional",
            auto_return: "all",
            marketplace: "IGA PRODUCTOS",
            expires: true,
            expiration_date_from: args.vigency.expirationFrom,
            expiration_date_to: args.vigency.expirationTo,
            notification_url: args.notificationUrl,
            external_reference: args.internalOrderId,
        }
    };
};

export const buildOrderVigency = () => {
    const date = new Date();
    const VIGENCY_DAYS = 5;
    const expirationFrom = date.toISOString();
    const calculateVigency = date.getTime() + VIGENCY_DAYS * 24 * 60 * 60 * 1000;
    const expirationTo = new Date(calculateVigency).toISOString();
    return { expirationFrom, expirationTo };
};

export const buildValidatedCustomerData = (args: {
    customerData: {
        name: string,
        last_name: string,
        email: string
        id?: string,
    } | null,
    customerAddressData: {
        zip_code: string,
        street_name: string,
        city: string,
        state: string,
        number: string,
        country: string,
        id?: string
    } | null,
    guestForm?: OrderRequestFormGuestDTO
}): OrderValidatedCustomerData | null => {
    const { customerData, customerAddressData, guestForm } = args;
    if (customerData && customerAddressData && !guestForm) {
        return {
            customer: {
                id: customerData.id,
                name: customerData.name,
                last_name: customerData.last_name,
                email: customerData.email
            },
            customerAddress: {
                id: customerAddressData.id,
                zip_code: customerAddressData.zip_code,
                street_name: customerAddressData.street_name,
                city: customerAddressData.city,
                state: customerAddressData.state,
                number: customerAddressData.number,
                country: customerAddressData.country
            }
        };
    };
    if (guestForm && !customerData && !customerAddressData) {
        return {
            customer: {
                id: undefined,
                name: guestForm.first_name,
                last_name: guestForm.last_name,
                email: guestForm.email
            },
            customerAddress: {
                id: undefined,
                zip_code: guestForm.zip_code,
                street_name: guestForm.street_name,
                city: guestForm.city,
                state: guestForm.state,
                number: guestForm.number,
                country: guestForm.country
            }
        };
    };

    return null;
};
