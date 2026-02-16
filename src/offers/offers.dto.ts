import { ApiProperty, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";
import { OfferStatus, OfferTargetType, OfferType } from "generated/prisma/enums";
import { PaginationDTO } from "src/common/DTO/pagination.dto";

export class Offer {
    @ApiProperty({ description: "Id de la oferta" })
    id: string;

    @ApiProperty({ description: "Id del usuario que creó la oferta" })
    user_id: string;

    @ApiProperty({ description: "UUID de la oferta" })
    uuid: string;

    @ApiProperty({ description: "Descripción de la oferta" })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: "Código de la oferta", required: false })
    @IsString()
    @IsOptional()
    code?: string | null;

    @ApiProperty({ description: "Porcentaje de descuento de la oferta" })
    @IsNumber()
    @IsNotEmpty()
    discount_percentage: number;

    @ApiProperty({ description: "Tipo de oferta", enum: OfferType })
    @IsEnum(OfferType)
    @IsNotEmpty()
    type: OfferType;

    @ApiProperty({ description: "Fecha de inicio de la oferta" })
    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    start_date: Date;

    @ApiProperty({ description: "Estado de la oferta", enum: OfferStatus })
    @IsEnum(OfferStatus)
    @IsNotEmpty()
    status: OfferStatus;

    @ApiProperty({ description: "Fecha de fin de la oferta" })
    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    end_date: Date;

    @ApiProperty({ required: false, description: "Cantidad máxima de usos de la oferta" })
    @IsOptional()
    @IsNumber()
    max_uses?: number | null;

    @ApiProperty({ description: "Cantidad de usos de la oferta" })
    current_uses?: number;

    @ApiProperty({ description: "Fecha de creación de la oferta" })
    created_at: Date;

    @ApiProperty({ description: "Fecha de actualización de la oferta" })
    updated_at: Date;
};

export class OfferTarget {

    @ApiProperty({ description: "Id de la oferta objetivo" })
    id: string;

    @ApiProperty({ description: "Id del detalle de la oferta" })
    offer_id: string;

    @ApiProperty({ description: "Tipo de objetivo de la oferta", enum: OfferTargetType })
    @IsEnum(OfferTargetType)
    @IsNotEmpty()
    target_type: OfferTargetType;

    @ApiProperty({ required: false, description: "Id del objetivo de la oferta" })
    @IsOptional()
    @IsString()
    target_id?: string;

    @ApiProperty({ required: false, description: "Subcategorias del objetivo de la oferta" })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => String)
    target_uuid_path?: string[];
};

export class SafeOffer extends OmitType(Offer, ["id", "user_id"] as const) { };
export class OfferAttributes extends OmitType(Offer, ["id", "user_id", "uuid", "current_uses", "created_at", "updated_at"] as const) { };
export class OfferTargetDTO extends PickType(OfferTarget, ["target_type", "target_uuid_path"] as const) {
    @ApiProperty({ required: false, description: "UUID del objetivo de la oferta" })
    @ValidateIf(o => ['PRODUCT_VERSION', 'PRODUCT', 'CATEGORY'].includes(o.target_type))
    @IsNotEmpty({ message: 'target_uuid es requerido para este tipo de objetivo' })
    @IsString()
    target_uuid?: string;
};
export class OfferUpdateAttributes extends PickType(Offer, ["start_date", "end_date", "max_uses"] as const) { };

export class CreateOfferDTO extends OfferAttributes {
    @ApiProperty({ description: "Objetivo de la oferta", type: OfferTargetDTO })
    @ValidateNested()
    @Type(() => OfferTargetDTO)
    target: OfferTargetDTO;
};

export class UpdateOfferDTO extends PartialType(OfferUpdateAttributes) {
    @ApiProperty({ description: "UUID de la oferta" })
    @IsString()
    @IsNotEmpty()
    uuid: string;
};

export class SafeGetOffers extends SafeOffer {
    @ApiProperty({ description: "Tipo de objetivo de la oferta", enum: OfferTargetType })
    @IsEnum(OfferTargetType)
    target_type: OfferTargetType;
};

export class GetOffers {
    @ApiProperty({ description: "Lista de ofertas" })
    data: SafeGetOffers[];
    @ApiProperty({ description: "Total de registros encontrados en la base de datos" })
    totalRecords: number;
    @ApiProperty({ description: "Total de paginas" })
    totalPages: number;
};


export class OffersDashboardParams extends PaginationDTO {
    @ApiProperty({ description: "Ordenamiento (asc por defecto)", enum: ["asc", "desc"] })
    @IsString()
    @IsOptional()
    @Type(() => String)
    orderby?: "asc" | "desc";

    @ApiProperty({ description: "Tipo de oferta (si no se especifica ninguna se busca por todos en general)", enum: OfferTargetType })
    @IsString()
    @IsOptional()
    @Type(() => String)
    type?: OfferTargetType;
};