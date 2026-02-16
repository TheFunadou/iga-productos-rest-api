import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { Decimal } from "@prisma/client/runtime/client";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { ShippingStatus } from "generated/prisma/enums";


export class Shipping {
    @ApiProperty({ description: "ID del envio" })
    id: string;

    @ApiProperty({ description: "UUID del envio" })
    @IsString()
    @IsOptional()
    uuid?: string;

    @ApiProperty({ description: "ID de la orden" })
    order_id: string;

    @ApiProperty({ description: "Estado del envio", enum: ShippingStatus })
    @IsEnum(ShippingStatus)
    shipping_status: ShippingStatus;

    @ApiProperty({ description: "Concepto del envio" })
    @IsString()
    concept: string;

    @ApiProperty({ description: "Numero de seguimiento del envio" })
    @IsString()
    @IsOptional()
    tracking_number?: string | null;

    @ApiProperty({ description: "Transportista del envio" })
    @IsString()
    @IsOptional()
    carrier?: string | null;

    @ApiProperty({ description: "Costo del envio" })
    shipping_amount: Decimal | string;

    @ApiProperty({ description: "Costo del seguro del envio" })
    @IsString()
    @IsOptional()
    insurance_amount?: Decimal | string;

    @ApiProperty({ description: "Cantidad de cajas del envio" })
    boxes_count: number;

    @ApiProperty({ description: "Fecha de creacion del envio" })
    created_at: Date;

    @ApiProperty({ description: "Fecha de actualizacion del envio" })
    updated_at: Date
};

export class CreateShippingDTO extends OmitType(Shipping, ["id", "order_id", "created_at", "updated_at", "boxes_count", "shipping_amount" as const]) { };
export class UpdateShippingDTO extends PartialType(CreateShippingDTO) { };
export class SafeShipping extends OmitType(Shipping, ["id", "order_id"] as const) { };
export class CustomerOrderShippingDetails extends OmitType(SafeShipping, ["uuid", "concept", "insurance_amount"] as const) { };

class SafeShippingWithOrderUUID extends SafeShipping {
    @ApiProperty({ description: "UUID de la orden" })
    order_uuid: string;
}

export class GetShippingDashboard {
    @ApiProperty({ description: "Array de objetos de los envios", type: SafeShippingWithOrderUUID, isArray: true })
    data: SafeShippingWithOrderUUID[];
    @ApiProperty({ description: "Total de paginas", type: Number })
    totalPages: number;
    @ApiProperty({ description: "Total de registros", type: Number })
    totalRecords: number;
};