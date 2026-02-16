import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";
import { OrderAndPaymentStatus } from "generated/prisma/enums";
import { Order } from "mercadopago";
import { GetCustomerAddressPayment } from "src/customer/customer-addresses/customer-addresses.dto";
import { CustomerAttributes } from "src/customer/customer.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { SafeOrder, SafePaymentDetails } from "../order.dto";

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
    product: string;

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
};


export class PaymentProcessed {

    @ApiProperty({ description: "Dirección de envio del destinatario", type: GetCustomerAddressPayment })
    address: GetCustomerAddressPayment;

    @ApiProperty({ description: "Items de la orden", type: [OrderItems] as const })
    items: OrderItems[];

    @ApiProperty({ description: "Cliente", type: CustomerAttributes })
    customer?: CustomerAttributes;

    @ApiProperty({ description: "Detalle de la orden", type: OrderPaymentDetails })
    details: OrderPaymentDetails;
};


export class GetPaidOrderDetails {
    @ApiProperty({ description: "Estado de la orden", enum: OrderAndPaymentStatus })
    status: OrderAndPaymentStatus;

    @ApiProperty({ description: "Detalle de la orden", type: PaymentProcessed })
    order?: PaymentProcessed;
};