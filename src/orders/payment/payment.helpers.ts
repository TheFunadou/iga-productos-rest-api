import { OrderAndPaymentStatus } from "@prisma/client";
import { CustomerPaymentData, GetPaidOrderDetails, MercadoPagoPaymentStatus, OrderItems, OrderResume, PaymentDetails } from "./payment.dto";
import { OrderRequestFormGuestDTO } from "../order.dto";
import { IVA_VALUE, MAX_ITEMS_PER_BOX_VALUE, SHIPPING_BOX_COST_VALUE } from "../orders.helpers";


export function isMercadoPagoStatus(value: string): value is MercadoPagoPaymentStatus {
    return [
        "approved", "rejected", "in_process",
        "cancelled", "authorized", "pending",
        "refunded", "in_mediation", "charged_back"
    ].includes(value);
};

export const formatMercadoPagoOrderStatus: Record<MercadoPagoPaymentStatus, OrderAndPaymentStatus> = {
    approved: "APPROVED",
    rejected: "REJECTED",
    in_process: "IN_PROCESS",
    cancelled: "CANCELLED",
    authorized: "AUTHORIZED",
    pending: "PENDING",
    refunded: "REFUNDED",
    in_mediation: "IN_MEDIATION",
    charged_back: "CHARGED_BACK"
};

export const buildPaymentOrderItems = ({ orderDetails }: { orderDetails: PaymentDetails }): OrderItems[] => {
    return orderDetails.order_items.map((item) => ({
        category: item.product_version.product.category.name,
        subcategories: item.product_version.product.subcategories.map((sub) => sub.subcategories.description),
        isChecked: true,
        product_images: item.product_version.product_version_images,
        product_name: item.product_version.product.product_name,
        product_version: {
            color_code: item.product_version.color_code,
            color_name: item.product_version.color_name,
            color_line: item.product_version.color_line,
            sku: item.product_version.sku,
            unit_price: item.product_version.unit_price,
            stock: item.product_version.stock,
            unit_price_with_discount: item.discount > 0 ?
                (item.discount * (parseFloat(item.product_version.unit_price.toString()) / 100)).toString()
                : item.product_version.unit_price.toString(),
        },
        quantity: item.quantity,
        discount: item.discount > 0 ? item.discount : undefined,
        isFavorite: false,
        subtotal: item.subtotal.toString(),
        isOffer: item.discount > 0
    }));
}

export const buildAuthCustomerGetPaymentDetailsResponse = (
    args: {
        orderItems: OrderItems[],
        customerData: CustomerPaymentData,
        orderDetails: PaymentDetails,
        orderStatus: OrderAndPaymentStatus,
    }
): GetPaidOrderDetails => {
    const { orderItems, customerData, orderDetails, orderStatus } = args;
    return {
        status: orderStatus,
        order: {
            address: customerData.customer_addresses[0],
            items: orderItems,
            customer: {
                email: customerData.email,
                name: customerData.name,
                last_name: customerData.last_name,
            },
            details: {
                order: {
                    uuid: orderDetails.uuid,
                    total_amount: orderDetails.total_amount.toString(),
                    aditional_resource_url: orderDetails.aditional_resource_url,
                    coupon_code: orderDetails.coupon_code,
                    created_at: orderDetails.created_at,
                    updated_at: orderDetails.updated_at,
                    exchange: orderDetails.exchange,
                    is_guest_order: orderDetails.is_guest_order,
                    payment_provider: orderDetails.payment_provider,
                    status: orderStatus,
                },
                payments_details: orderDetails.payment_details.map((details) => ({
                    ...details,
                    customer_paid_amount: details.customer_paid_amount.toString(),
                    customer_installment_amount: details.customer_installment_amount.toString()
                })),
                shipping: {
                    boxesQty: orderDetails.shipping?.boxes_count,
                    shippingCost: orderDetails.shipping?.shipping_amount.toString()
                },
                resume: calcOrderItemsResume({ orderItems })
            }
        }
    }
};

export const buildGuestGetPaymentDetailsResponse = (
    args: {
        orderItems: OrderItems[],
        guestData: OrderRequestFormGuestDTO,
        orderDetails: PaymentDetails,
        orderStatus: OrderAndPaymentStatus,
    }
): GetPaidOrderDetails => {
    const { orderItems, guestData, orderDetails, orderStatus } = args;
    return {
        status: orderStatus,
        order: {
            address: {
                address_type: guestData.address_type,
                city: guestData.city,
                state: guestData.state,
                zip_code: guestData.zip_code,
                country: guestData.country,
                contact_number: guestData.contact_number,
                country_phone_code: guestData.country_phone_code,
                locality: guestData.locality,
                neighborhood: guestData.neighborhood,
                number: guestData.number,
                recipient_last_name: guestData.recipient_last_name,
                recipient_name: guestData.recipient_name,
                street_name: guestData.street_name,
                aditional_number: guestData.aditional_number,
                floor: guestData.floor,
                references_or_comments: guestData.references_or_comments
            },
            items: orderItems,
            customer: {
                email: guestData.email,
                name: guestData.first_name,
                last_name: guestData.last_name,
            },
            details: {
                order: {
                    uuid: orderDetails.uuid,
                    total_amount: orderDetails.total_amount.toString(),
                    aditional_resource_url: orderDetails.aditional_resource_url,
                    coupon_code: orderDetails.coupon_code,
                    created_at: orderDetails.created_at,
                    updated_at: orderDetails.updated_at,
                    exchange: orderDetails.exchange,
                    is_guest_order: orderDetails.is_guest_order,
                    payment_provider: orderDetails.payment_provider,
                    status: orderStatus,
                },
                payments_details: orderDetails.payment_details.map((details) => ({
                    ...details,
                    customer_paid_amount: details.customer_paid_amount.toString(),
                    customer_installment_amount: details.customer_installment_amount.toString()
                })),
                shipping: {
                    boxesQty: orderDetails.shipping?.boxes_count,
                    shippingCost: orderDetails.shipping?.shipping_amount.toString()
                },
                resume: calcOrderItemsResume({ orderItems })
            }
        }
    }
};

export const calcOrderItemsResume = ({ orderItems }: { orderItems: OrderItems[] }): OrderResume => {
    const itemsQty = orderItems.reduce((acc, item) => {
        return acc + item.quantity
    }, 0);
    const boxesQty = Math.ceil(itemsQty / MAX_ITEMS_PER_BOX_VALUE);
    const shippingCost = boxesQty * SHIPPING_BOX_COST_VALUE;

    const subtotal = orderItems.reduce((acc, item) => {
        const itemTotal = parseFloat(item.product_version.unit_price.toString()) * item.quantity;
        return acc + itemTotal;
    }, 0);

    const discount = orderItems.reduce((acc, item) => {
        if (item.isOffer && item.product_version.unit_price_with_discount) {
            return acc + (parseFloat(item.product_version.unit_price.toString()) - parseFloat(item.product_version.unit_price_with_discount)) * item.quantity;
        } else {
            return acc;
        }
    }, 0);

    const iva = subtotal * IVA_VALUE;
    const subtotalBeforeIVA = subtotal - iva;
    const subtotalWithDiscount = subtotal - discount;
    const total = subtotalWithDiscount + shippingCost;

    const response: OrderResume = {
        boxesQty,
        shippingCost,
        subtotalBeforeIVA,
        subtotalWithDiscount,
        discount,
        iva,
        total
    };

    return response;
};

