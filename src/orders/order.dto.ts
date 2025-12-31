import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsObject, IsString, ValidateNested } from "class-validator";
import { PaymentShoppingCartDTO } from "./payment/payment.dto";
import { CreateCustomerAddressDTO as GuestAddressDTO } from 'src/customer/customer-addresses/customer-addresses.dto';
import { CustomerAttributes } from "src/customer/customer.dto";

export class OrderRequestDTO {
    @ApiProperty({ description: "Array de objetos de los productos/items que se van a comprar", type: PaymentShoppingCartDTO, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentShoppingCartDTO)
    shopping_cart: PaymentShoppingCartDTO[];

    @ApiProperty({ description: "Domicilio de envio del producto", type: String })
    @IsString()
    address: string;
};

export class OrderRequestGuestDTO {
    @ApiProperty({ description: "Array de objetos de los productos/items que se van a comprar", type: PaymentShoppingCartDTO, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentShoppingCartDTO)
    shopping_cart: PaymentShoppingCartDTO[];

    @ApiProperty({ description: "Datos del invitado" })
    @IsObject()
    @ValidateNested()
    @Type(() => CustomerAttributes)
    guest: CustomerAttributes;

    @ApiProperty({ description: "Domicilio de envio del producto", type: GuestAddressDTO })
    @ValidateNested()
    @Type(() => GuestAddressDTO)
    address: GuestAddressDTO;
}


