import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { Decimal } from "@prisma/client/runtime/client";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ShippingStatus } from "@prisma/client";
import { CreateCustomerAddressDTO } from "src/customer/customer-addresses/application/DTO/customer-addresses.dto";


export class CreateShippingDTO {
    @ApiProperty({ description: "UUID de la orden" })
    @IsString()
    @IsNotEmpty({ message: "El UUID/Folio de la orden no esta incluida en la petición" })
    orderUUID: string;

    @ApiProperty({ description: "Estado del envio", enum: ShippingStatus })
    @IsEnum(ShippingStatus)
    @IsNotEmpty({ message: "El estatus del envio no esta incluido en la petición" })
    shippingStatus: ShippingStatus;

    @ApiProperty({ description: "Concepto del envio" })
    @IsString()
    @IsNotEmpty({ message: "El concepto del envio no esta incluid en la petición" })
    concept: string;

    @ApiProperty({ description: "Numero de seguimiento del envio" })
    @IsString()
    @IsOptional()
    trackingNumber?: string | null;

    @ApiProperty({ description: "Transportista del envio" })
    @IsString()
    @IsOptional()
    carrier?: string | null;

    @ApiProperty({ description: "Costo del envio" })
    @IsString()
    @IsNotEmpty()
    shippingAmount: string;

    @ApiProperty({ description: "Costo del seguro del envio" })
    @IsString()
    @IsOptional()
    insuranceAmount?: Decimal | string;

    @ApiProperty({ description: "Cantidad de cajas del envio" })
    @IsInt()
    @IsNotEmpty()
    boxesCount: number;

    @ApiProperty({ description: "Fecha en la que se envio la orden" })
    @IsString()
    @IsOptional()
    shippedAt?: Date | string;

    @ApiProperty({ description: "Fecha en la que se entrego la orden" })
    @IsString()
    @IsOptional()
    deliveredAt?: Date | string;

    @ApiProperty({ description: "ID de la informacion de envio" })
    @IsString()
    @IsNotEmpty({ message: "El ID de la informacion de envio no esta incluido en la petición" })
    shippingInfoId: string;
};

export class UpdateShippingDTO extends PartialType(OmitType(CreateShippingDTO, ["orderUUID"] as const)) {
    @ApiProperty({ description: "UUID del envio" })
    @IsString()
    @IsNotEmpty({ message: "El UUID del envio no esta incluido en la petición" })
    uuid: string;
};

export class CreateShippingInfoDTO extends OmitType(CreateCustomerAddressDTO, ["defaultAddress"] as const) {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: "El campo orderId no puede estar vacio" })
    orderUUID: string;
};


