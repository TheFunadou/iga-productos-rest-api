import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { OrderShoppingCartDTO } from "./payment/payment.dto";
import { CreateCustomerAddressDTO as GuestAddressDTO } from 'src/customer/customer-addresses/customer-addresses.dto';
import { CustomerAttributes } from "src/customer/customer.dto";

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
    customer: CustomerAttributes;
    address: GuestAddressDTO;
    createdAt: Date | string;
};


