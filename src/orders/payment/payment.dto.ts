import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { CreateCustomerAddressDTO } from "src/customer/customer-addresses/customer-addresses.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";

export type PaymentProviders = "mercado_pago" | "paypal";

export class PaymentShoppingCartDTO {
    @ApiProperty({ description: "SKU del producto que se va comprar", type: String })
    @IsString()
    product: string;

    @ApiProperty({ description: "Cantidad de productos a comprar", type: Number })
    @IsNumber()
    quantity: number;
};


export class PaymentOrderDTO {
    @ApiProperty({ description: "folio (local) de la operación", type: String })
    @IsString()
    folio: string;

    @ApiProperty({ description: "items/productos que estan en proceso de pago", type: [ShoppingCartDTO] as const })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ShoppingCartDTO)
    items: ShoppingCartDTO[];

    @ApiProperty({ description: "ID de la preferencia creada por mercado pago", type: String })
    @IsString()
    order_id: string;

    @ApiProperty({ description: "Dirección de envio del destinatario", type: CreateCustomerAddressDTO })
    @IsObject()
    @Type(() => CreateCustomerAddressDTO)
    receiver_address: CreateCustomerAddressDTO;

    @ApiProperty({ description: "Domicilio de envio del producto", type: String })
    @IsString()
    payment_method: PaymentProviders;
};
