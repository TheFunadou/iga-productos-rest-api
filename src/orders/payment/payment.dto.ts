import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";
import { OrderAndPaymentStatus } from "@prisma/client";
import { Order } from "mercadopago";
import { GetCustomerAddressPayment } from "src/customer/customer-addresses/customer-addresses.dto";
import { CustomerAttributes } from "src/customer/customer.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { SafeOrder, SafePaymentDetails } from "../order.dto";
import { Decimal } from "@prisma/client/runtime/library";

export type PaymentProviders = "mercado_pago" | "paypal";
export type MercadoPagoPaymentStatus = "approved" | "rejected" | "in_process" | "cancelled" | "authorized" | "pending" | "in_mediation" | "refunded" | "charged_back"

export class OrderItems extends ShoppingCartDTO {
    @ApiProperty({ description: "Subtotal", type: String })
    subtotal: string;
};

export class PaidOrderShipping {
    @ApiProperty({ description: "Cantidad de cajas", type: Number })
    boxesQty?: number;

    @ApiProperty({ description: "Costo de envio", type: Number })
    shippingCost?: string;
};


export class OrderShoppingCartDTO {
    @ApiProperty({ description: "SKU del producto que se va comprar", type: String })
    @IsString()
    sku: string;

    @ApiProperty({ description: "Cantidad de productos a comprar", type: Number })
    @IsNumber()
    quantity: number;
};


export class OrderResume {
    @ApiProperty({ description: "Costo de envio", type: Number })
    shippingCost: number;

    @ApiProperty({ description: "Cantidad de cajas", type: Number })
    boxesQty: number;

    @ApiProperty({ description: "Subtotal", type: Number })
    subtotalBeforeIVA: number;

    @ApiProperty({ description: "Subtotal", type: Number })
    subtotalWithDiscount: number;

    @ApiProperty({ description: "Total", type: Number })
    total: number;

    @ApiProperty({ description: "Descuento", type: Number })
    discount: number;

    @ApiProperty({ description: "IVA", type: Number })
    iva: number;
};


export class OrderReadyToPay {
    @ApiProperty({ description: "folio (local) de la operación", type: String })
    folio: string;
    @ApiProperty({ description: "ID de la preferencia creada por mercado pago", type: String })
    external_id: string;
    @ApiProperty({ description: "Domicilio de envio del producto", type: String })
    payment_method: PaymentProviders;
};

export class OrderPaymentDetails {
    @ApiProperty({ description: "Detalle de la orden", type: Order })
    order: SafeOrder;

    @ApiProperty({ description: "Detalles de pago", type: [SafePaymentDetails], isArray: true })
    payments_details: SafePaymentDetails[];

    @ApiProperty({ description: "Detalle de envio", type: PaidOrderShipping })
    shipping?: PaidOrderShipping;

    @ApiProperty({ description: "Resumen de la orden", type: OrderResume })
    resume: OrderResume;
};


export class PaymentProcessed {

    @ApiProperty({ description: "Dirección de envio del destinatario", type: GetCustomerAddressPayment })
    address: GetCustomerAddressPayment;

    @ApiProperty({ description: "Items de la orden", type: [OrderItems] as const })
    items: OrderItems[];

    @ApiProperty({ description: "Cliente", type: CustomerAttributes })
    customer: CustomerAttributes;

    @ApiProperty({ description: "Detalle de la orden", type: OrderPaymentDetails })
    details: OrderPaymentDetails;
};


export class GetPaidOrderDetails {
    @ApiProperty({ description: "Estado de la orden", enum: OrderAndPaymentStatus })
    status: OrderAndPaymentStatus;

    @ApiProperty({ description: "Detalle de la orden", type: PaymentProcessed })
    order?: PaymentProcessed;
};

export class CustomerPaymentData extends CustomerAttributes {
    @ApiProperty({ description: "Dirección de envio del destinatario", type: GetCustomerAddressPayment })
    customer_addresses: GetCustomerAddressPayment[];
};

export interface PaymentDetails {
    uuid: string;
    is_guest_order: boolean;
    payment_provider: string;
    buyer_name: string | null;
    buyer_surname: string | null;
    buyer_email: string | null;
    buyer_phone: string | null;
    total_amount: Decimal;
    exchange: string;
    aditional_resource_url: string | null;
    coupon_code: string | null;
    created_at: Date;
    updated_at: Date;
    payment_details: {
        created_at: Date;
        updated_at: Date;
        last_four_digits: string;
        payment_class: string;
        payment_method: string;
        customer_paid_amount: Decimal;
        customer_installment_amount: Decimal;
        installments: number;
        payment_status: OrderAndPaymentStatus;
    }[];
    order_items: {
        quantity: number;
        unit_price: Decimal;
        subtotal: Decimal,
        discount: number,
        product_version: {
            unit_price: Decimal,
            sku: string,
            color_line: string,
            color_name: string,
            color_code: string,
            stock: number,
            product_version_images: {
                main_image: boolean,
                image_url: string
            }[],
            product: {
                id: string,
                category_id: string,
                product_name: string,
                category: {
                    name: string
                },
                subcategories: {
                    subcategories: {
                        uuid: string,
                        description: string
                    }
                }[]
            }
        }
    }[],
    shipping: {
        boxes_count: number,
        shipping_amount: Decimal
    }[],
    shipping_info: {
        recipient_name: string;
        recipient_last_name: string;
        country: string;
        state: string;
        locality: string;
        city: string;
        street_name: string;
        neighborhood: string;
        zip_code: string;
        address_type: string;
        floor?: string | null;
        number: string;
        aditional_number?: string | null;
        references_or_comments?: string | null;
        country_phone_code: string
        contact_number: string;
    } | null
}

export interface MercadoPagoWebhook {
    xSignature: string;
    xRequestId: string;
    dataId: string;
    type: string;
};

