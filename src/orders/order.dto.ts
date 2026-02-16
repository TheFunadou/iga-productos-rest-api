import { ApiProperty, OmitType, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { OrderItems, OrderResume, OrderShoppingCartDTO } from "./payment/payment.dto";
import { GetCustomerAddressPayment, CreateCustomerAddressDTO as GuestAddressDTO } from 'src/customer/customer-addresses/customer-addresses.dto';
import { CustomerAttributes } from "src/customer/customer.dto";
import { OrderAndPaymentStatus, ShippingStatus } from "generated/prisma/enums";
import { PaginationDTO } from "src/common/DTO/pagination.dto";
import { CustomerOrderShippingDetails } from "src/shipping/shipping.dto";

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
export class LightGetOrders extends OmitType(SafeOrder, ["is_guest_order", "exchange", "payment_provider", "coupon_code" as const]) { };
export class SafePaymentDetails extends OmitType(OrderPaymentDetails, ["id", "order_id", "payment_id", "fee_amount", "received_amount"] as const) { };


export class CheckoutOrder {
    @ApiProperty({ description: "folio (local) de la operación", type: String })
    uuid: string;
    @ApiProperty({ description: "Items de la orden", type: [OrderItems] as const })
    items: OrderItems[];
    @ApiProperty({ description: "Resumen de la orden", type: OrderResume })
    resume: OrderResume;
    @ApiProperty({ description: "ID externo de la orden", type: String })
    external_id: string;
    @ApiProperty({ description: "Dirección de envio del destinatario", type: GetCustomerAddressPayment })
    address: GetCustomerAddressPayment;
};


export class GetLightOrderExtended {
    @ApiProperty({ description: "Breve infromacion de la orden" })
    order: LightGetOrders;
    @ApiProperty({ description: "Status del envio" })
    shippingStatus?: ShippingStatus;
    @ApiProperty({ description: "Algunas de las imagenes de la orden" })
    orderItemImages: string[];
    @ApiProperty({ description: "Total de items de la orden" })
    totalOrderItems: number;
};


export class GetOrders {
    @ApiProperty({ description: "Array de objetos de las ordenes", type: LightGetOrders, isArray: true })
    data: GetLightOrderExtended[];
    @ApiProperty({ description: "Total de paginas", type: Number })
    totalPages: number;
    @ApiProperty({ description: "Total de registros", type: Number })
    totalRecords: number;
};

export class OrderMoreDetails {
    @ApiProperty({ description: "Detalle de la orden", type: Order })
    order: SafeOrder;

    @ApiProperty({ description: "Detalles de pago", type: [SafePaymentDetails], isArray: true })
    payments_details: SafePaymentDetails[];

    @ApiProperty({ description: "Detalle de envio", type: CustomerOrderShippingDetails })
    shipping?: CustomerOrderShippingDetails | null;

    @ApiProperty({ description: "Resumen de la orden", type: OrderResume })
    resume: OrderResume;
};



export class OrderDetails {
    @ApiProperty({ description: "Dirección de envio del destinatario", type: GetCustomerAddressPayment })
    address: GetCustomerAddressPayment;

    @ApiProperty({ description: "Items de la orden", type: [OrderItems] as const })
    items: OrderItems[];

    @ApiProperty({ description: "Cliente", type: CustomerAttributes })
    customer?: CustomerAttributes;

    @ApiProperty({ description: "Detalle de la orden", type: OrderDetails })
    details: OrderMoreDetails;
};

export class GetOrderDetails {
    status: OrderAndPaymentStatus;
    order?: OrderDetails;
};


export class GetOrdersQuery extends PaginationDTO {
    @IsOptional()
    @IsIn(['recent', 'oldest'])
    orderBy: 'recent' | 'oldest';
};

export class OrdersDashboardParams extends PaginationDTO {
    @ApiProperty({ description: "Ordenamiento (asc por defecto)", enum: ["asc", "desc"] })
    @IsString()
    @IsOptional()
    @Type(() => String)
    orderby?: "asc" | "desc";

    @ApiProperty({ example: "xxxx-xxxxx-xxxx-xxxx", description: "UUID de la orden" })
    @IsString()
    @IsOptional()
    uuid?: string;
};

class SafeOrderWithShippingStatusAndCustomerUUID extends SafeOrder {
    @ApiProperty({ description: "Status del envio", enum: ShippingStatus })
    shipping_status: ShippingStatus | null;

    @ApiProperty({ description: "UUID del cliente", type: String })
    customer_uuid?: string;
};


export class GetOrdersDashboard {
    @ApiProperty({ description: "Array de objetos de las ordenes", type: SafeOrder, isArray: true })
    data: SafeOrderWithShippingStatusAndCustomerUUID[];
    @ApiProperty({ description: "Total de paginas", type: Number })
    totalPages: number;
    @ApiProperty({ description: "Total de registros", type: Number })
    totalRecords: number;
};