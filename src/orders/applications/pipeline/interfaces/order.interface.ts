import { OrderValidatedCustomerData } from "src/orders/payment/application/DTO/order.dto";
import { Items as MercadoPagoItems } from "mercadopago/dist/clients/commonTypes";
import { ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";
import { GetCustomerAddressOrder } from "src/customer/customer-addresses/customer-addresses.dto";
import { OrderAndPaymentStatus, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface OrderShoppingCartI {
    versionId: string;
    productUUID: string;
    sku: string;
    imageUrl: string;
    subcategories: string[];
    productName: string;
    category: string;
    unitPrice: string;
    finalPrice: string;
    quantity: number;
    offer: { isOffer: boolean, discount: number, offerIds: string[] };
    subtotal: string;
};

export interface OrderCheckoutItemI {
    name: string;
    category: string;
    subcategories: { uuid: string, name: string }[];
    sku: string;
    color: { line: string, name: string, code: string };
    unitPrice: string;
    finalPrice: string;
    quantity: number;
    offer: { isOffer: boolean, discount: number };
    subtotal: string;
    images: { url: string, mainImage: boolean }[];
};

export interface CheckoutOrderI {
    orderUUID: string;
    items: OrderCheckoutItemI[];
    resume: ShoppingCartResumeI;
    couponCode: string | null;
    externalId: string;
    shippingAddress: GetCustomerAddressOrder;
};

export interface OrderStrategyArgsI {
    orderUUID: string;
    orderShoppingCart: OrderShoppingCartI[],
    validatedCustomer: OrderValidatedCustomerData;
    shippingCost: string;
    frontendUrl: string;
    notificationUrl: string;
};


export interface MercadoPagoPreferenceBodyI {
    items: MercadoPagoItems[];
    internalOrderUUID: string;
    vigency: { expirationFrom: string, expirationTo: string };
    customer: OrderValidatedCustomerData;
    shippingCost: string;
    frontendUrl: string;
    notificationUrl: string;
};

export interface CustomerOrdersSummaryI {
    uuid: string;
    createdAt: Date;
    updatedAt: Date;
    status: OrderAndPaymentStatus;
    paymentProvider: string;
    totalAmount: string;
    items: OrderCheckoutItemI[];
};


export interface GetOrdersSummaryI {
    data: CustomerOrdersSummaryI[];
    totalPages: number;
    totalRecords: number;
    currentPage: number;
};

export const PrismaOrderItemsSelectI = {
    order_items: {
        select: {
            quantity: true,
            discount: true,
            unit_price: true,
            final_price: true,
            isOffer: true,
            subtotal: true,
            product_version: {
                select: {
                    sku: true,
                    color_line: true,
                    color_name: true,
                    color_code: true,
                    product_version_images: {
                        select: { main_image: true, image_url: true },
                        orderBy: { main_image: "desc" as const }
                    },
                    product: {
                        select: {
                            product_name: true,
                            category: { select: { name: true } },
                            subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
                        }
                    }
                }
            }
        }
    }
}

export interface PrismaOrderItemI {
    quantity: number;
    discount: number;
    unit_price: Decimal;
    final_price: Decimal;
    isOffer: boolean;
    subtotal: Decimal;
    product_version: {
        sku: string;
        color_line: string;
        color_name: string;
        color_code: string;
        product: {
            product_name: string;
            category: { name: string; };
            subcategories: {
                subcategories: {
                    uuid: string;
                    description: string;
                };
            }[];
        };
        product_version_images: {
            main_image: boolean;
            image_url: string;
        }[];
    };
};


