import { ApiProperty, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";


class Categories {
    @ApiProperty({ description: "ID de la categoria", example: "xxx-xxx-xxx", type: "string" })
    id: string;

    @ApiProperty({ description: "UUID de la categoria", example: "xxx-xxx-xxx", type: "string" })
    uuid: string;

    @ApiProperty({ description: "Nombre de la categoria", example: "Cascos", type: "string" })
    @IsString()
    name: string;

    @ApiProperty({ description: "Fecha de creación", example: "2025-12-17T14:20:03.000Z", type: "string" })
    created_at: Date;

    @ApiProperty({ description: "Fecha de actualización", example: "2025-12-17T14:20:03.000Z", type: "string" })
    updated_at: Date;
};

export class SafeCategory extends OmitType(Categories, ["id"] as const) { };
export class GetCategories extends OmitType(Categories, ["id"] as const) { };

// DTO
export class CreateCategoryDTO extends PickType(Categories, ["name"] as const) { };
export class PatchCategoryDTO extends PickType(Categories, ["name", "uuid"] as const) { };
