import { ApiProperty, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { OrderShoppingCartDTO } from "./payment/payment.dto";
import { CreateCustomerAddressDTO as GuestAddressDTO } from 'src/customer/customer-addresses/customer-addresses.dto';
import { CustomerAttributes } from "src/customer/customer.dto";
import { OrderAndPaymentStatus } from "generated/prisma/enums";

export class Order {
    @ApiProperty({ description: "ID de la orden", type: String })
    id: string;

    @ApiProperty({ description: "UUID de la orden", type: String })
    uuid: string;

    @ApiProperty({ description: "ID externo de la orden", type: String })
    external_order_id: string;

    @ApiProperty({ description: "ID del cliente", type: String })
    customer_id: string;

    @ApiProperty({ description: "ID del domicilio", type: String })
    customer_address_id: string;

    @ApiProperty({ description: "Es un pedido de invitado", type: Boolean })
    is_guest_order: boolean;

    @ApiProperty({ description: "Proveedor de pago", type: String })
    payment_provider: string;

    @ApiProperty({ description: "Estado de la orden", type: String })
    status: OrderAndPaymentStatus;

    @ApiProperty({ description: "Monto total de la orden", type: String })
    total_amount: string;

    @ApiProperty({ description: "Tipo de cambio", type: String })
    exchange: string;

    @ApiProperty({ description: "URL adicional", type: String })
    aditional_resource_url?: string | null;

    @ApiProperty({ description: "Código de cupón", type: String })
    coupon_code?: string | null;

    @ApiProperty({ description: "Fecha de creación", type: Date })
    created_at: Date;

    @ApiProperty({ description: "Fecha de actualización", type: Date })
    updated_at: Date;
};

export class OrderItemsDetails {
    @ApiProperty({ description: "ID de la orden", type: String })
    id: string;

    @ApiProperty({ description: "ID de la orden", type: String })
    order_id: string;

    @ApiProperty({ description: "ID de la versión del producto", type: String })
    product_version_id: string;

    @ApiProperty({ description: "Cantidad de productos", type: Number })
    quantity: number;

    @ApiProperty({ description: "Precio unitario", type: String })
    unit_price: string;

    @ApiProperty({ description: "Descuento", type: String })
    discount: string;

    @ApiProperty({ description: "Subtotal", type: String })
    subtotal: string;
};


export class OrderPaymentDetails {
    @ApiProperty({ description: "ID de la orden", type: String })
    id: string;

    @ApiProperty({ description: "ID de la orden", type: String })
    order_id: string;

    @ApiProperty({ description: "ID de la versión del producto", type: String })
    payment_id: string;

    @ApiProperty({ description: "Cantidad de productos", type: Number })
    last_four_digits: string;

    @ApiProperty({ description: "Precio unitario", type: String })
    payment_class: string;

    @ApiProperty({ description: "Descuento", type: String })
    payment_method: string;

    @ApiProperty({ description: "Monto pagado por el cliente", type: String })
    customer_paid_amount: string;

    @ApiProperty({ description: "Monto recibido", type: String })
    received_amount: string;

    @ApiProperty({ description: "Monto de la tarifa", type: String })
    fee_amount: string;

    @ApiProperty({ description: "Monto del cliente", type: String })
    customer_installment_amount: string;

    @ApiProperty({ description: "Cantidad de cuotas", type: Number })
    installments: number;

    @ApiProperty({ description: "Estado de la orden", type: String })
    payment_status: OrderAndPaymentStatus;

    @ApiProperty({ description: "Fecha de creación", type: Date })
    created_at: Date;

    @ApiProperty({ description: "Fecha de actualización", type: Date })
    updated_at: Date;
};

export class OrderRequestDTO {
    @ApiProperty({ description: "Array de objetos de los productos/items que se van a comprar", type: OrderShoppingCartDTO, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderShoppingCartDTO)
    shopping_cart: OrderShoppingCartDTO[];

    @ApiProperty({ description: "Domicilio de envio del producto", type: String })
    @IsString()
    address: string;

    @ApiProperty({ description: "Código de cupón", type: String })
    @IsString()
    @IsOptional()
    coupon_code?: string;
};

export class OrderRequestGuestDTO {
    @ApiProperty({ description: "Array de objetos de los productos/items que se van a comprar", type: OrderShoppingCartDTO, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderShoppingCartDTO)
    shopping_cart: OrderShoppingCartDTO[];

    @ApiProperty({ description: "Datos del invitado" })
    @IsObject()
    @ValidateNested()
    @Type(() => CustomerAttributes)
    guest: CustomerAttributes;

    @ApiProperty({ description: "Domicilio de envio del producto", type: GuestAddressDTO })
    @ValidateNested()
    @Type(() => GuestAddressDTO)
    address: GuestAddressDTO;
};

export class GuestOrderData {
    @ApiProperty({ description: "Datos del invitado", type: CustomerAttributes })
    customer: CustomerAttributes;
    @ApiProperty({ description: "Domicilio de envio del producto", type: GuestAddressDTO })
    address: GuestAddressDTO;
    @ApiProperty({ description: "Fecha de creación", type: Date })
    createdAt: Date | string;
};


export class SafeOrder extends OmitType(Order, ["id", "external_order_id", "customer_id", "customer_address_id"] as const) { };
export class SafePaymentDetails extends OmitType(OrderPaymentDetails, ["id", "order_id", "payment_id", "fee_amount", "received_amount"] as const) { };


