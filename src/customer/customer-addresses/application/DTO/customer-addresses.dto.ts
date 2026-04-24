import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCustomerAddressDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo recipientName no puede estar vacio" })
    recipientName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo recipientLastName no puede estar vacio" })
    recipientLastName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo country no puede estar vacio" })
    country: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo state no puede estar vacio" })
    state: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo city no puede estar vacio" })
    city: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo locality no puede estar vacio" })
    locality: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo streetName no puede estar vacio" })
    streetName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo neighborhood no puede estar vacio" })
    neighborhood: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo zipCode no puede estar vacio" })
    zipCode: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo addressType no puede estar vacio" })
    addressType: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    floor?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo number no puede estar vacio" })
    number: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    aditionalNumber?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    referencesOrComments?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo countryPhoneCode no puede estar vacio" })
    countryPhoneCode: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo contactNumber no puede estar vacio" })
    contactNumber: string;

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty({ message: "El campo defaultAddress no puede estar vacio" })
    defaultAddress: boolean;
};


export class UpdateCustomerAddressDTO extends PartialType(OmitType(CreateCustomerAddressDTO, ["defaultAddress" as const])) {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo uuid no puede estar vacio" })
    uuid: string;

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty({ message: "El campo defaultAddress no puede estar vacio" })
    defaultAddress: boolean;
};

export class GuestAddressDTO extends OmitType(CreateCustomerAddressDTO, ["defaultAddress" as const]) { };
