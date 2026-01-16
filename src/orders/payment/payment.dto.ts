import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { CreateCustomerAddressDTO } from "src/customer/customer-addresses/customer-addresses.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";

export type PaymentProviders = "mercado_pago" | "paypal";
export type MercadoPagoPaymentStatus = "approved" | "rejected" | "in_process" | "cancelled" | "authorized" | "pending" | "in_mediation" | "refunded" | "charged_back"

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

    @ApiProperty({ description: "items/productos que estan en proceso de pago", type: [ShoppingCartDTO] as const })
    items: ShoppingCartDTO[];

    @ApiProperty({ description: "ID de la preferencia creada por mercado pago", type: String })
    order_id: string;

    @ApiProperty({ description: "Dirección de envio del destinatario", type: CreateCustomerAddressDTO })
    receiver_address: CreateCustomerAddressDTO;

    @ApiProperty({ description: "Domicilio de envio del producto", type: String })
    payment_method: PaymentProviders;

    @ApiProperty({ description: "Resumen de la operación", type: OrderResume })
    resume: OrderResume;
};
