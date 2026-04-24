
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { ProductVersionCard } from "src/product-version/product-version.dto";
import { Items as MercadoPagoItems } from "mercadopago/dist/clients/commonTypes";
import { OrderShoppingCartDTO } from "../payment/payment.dto";
import { MercadoPagoPreferenceBodyI, OrderShoppingCartI } from "../applications/pipeline/interfaces/order.interface";
import { MercadoPagoPreferenceBody } from "../payment/application/DTO/order.dto";

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
        quantity: args.orderItems.find(qty => qty.sku === item.product_version.sku)?.quantity!,
        currency_id: args.currency,
        unit_price: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) : parseFloat(item.product_version.unit_price!.toString())
    }));
};

export const buildMercadoPagoOrderItemsV2 = (args: {
    data: OrderShoppingCartI[]
    currency: "MXN" | "USD"
}): MercadoPagoItems[] => {
    return args.data.map((item) => ({
        id: item.sku,
        title: item.productName,
        description: item.subcategories.join(" "),
        picture_url: item.imageUrl,
        category_id: item.category,
        quantity: item.quantity,
        currency_id: args.currency,
        unit_price: item.offer.isOffer ? parseFloat(item.finalPrice) : parseFloat(item.unitPrice)
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

export const buildMercadoPagoPreferenceBodyV2 = (args: MercadoPagoPreferenceBodyI
): PreferenceCreateData => {
    const { customer, frontendUrl, internalOrderUUID, items, notificationUrl, shippingCost, vigency } = args;
    return {
        body: {
            items: items,
            payer: {
                email: customer.customer.email,
                name: customer.customer.name,
                surname: customer.customer.lastName,
            },
            back_urls: {
                success: new URL("pagar-productos/pago-exitoso", frontendUrl).href,
                failure: new URL("pagar-productos/pago-fallido", frontendUrl).href,
                pending: new URL("pagar-productos/pago-pendiente", frontendUrl).href
            },
            shipments: {
                cost: parseFloat(shippingCost),
                receiver_address: {
                    zip_code: customer.customerAddress.zipCode,
                    street_name: customer.customerAddress.streetName,
                    city_name: customer.customerAddress.city,
                    state_name: customer.customerAddress.state,
                    street_number: customer.customerAddress.number,
                    country_name: customer.customerAddress.country,
                },
            },
            auto_return: "all",
            marketplace: "Iga Productos",
            expires: true,
            expiration_date_from: vigency.expirationFrom,
            expiration_date_to: vigency.expirationTo,
            notification_url: notificationUrl,
            external_reference: internalOrderUUID,
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
