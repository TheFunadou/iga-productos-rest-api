import { ApiProperty, OmitType, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsString, IsUUID } from "class-validator";


export class Subcategories {
    @ApiProperty({ example: 1, description: "ID de la atributo/subcategoria" })
    id: string;

    @ApiProperty({ example: 1, description: "ID de categoria padre o principal" })
    category_id: string;

    @ApiProperty({ example: "Ala completa", description: "Descripcion del atributo/subcategoria" })
    @IsString()
    @IsNotEmpty({ message: "La descripcion no puede estar vacia" })
    description: string;

    @ApiProperty({ example: 0, description: "Nivel del atributo (1,2,3)" })
    level: number;

    @ApiProperty({ example: null, description: "ID del atributo/subcategoria padre (si no tiene padre puede ser nulo)" })
    father_id: string | null;

    @ApiProperty({ example: "xasd3-3423j4k-sdfsdf", description: "UUID del atributo/subcategoria" })
    uuid: string;

    @ApiProperty({ example: "xasd3-3423j4k-sdfsdf", description: "UUID del atributo/subcategoria padre" })
    father_uuid: string | null;

    @ApiProperty({ example: "2025-11-24T13:05:25.000Z", description: "Fecha de creacion" })
    created_at: Date;

    @ApiProperty({ example: "2025-11-24T13:05:25.000Z", description: "Fecha de actualizacion" })
    updated_at: Date;
};

export class SafeSubcategories extends OmitType(Subcategories, ["id", "father_id", "category_id"] as const) { };

export class CreateSubcategoryDTO extends PickType(Subcategories, ["description"] as const) {
    @ApiProperty({ example: ["xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"], type: [String], description: "Path de UUIDs en donde se insertara la nueva subcategoria" })
    @IsArray({ message: "La ruta de UUIDs debe ser un array" })
    @Type(() => String)
    uuid_path: string[] = [];

    @ApiProperty({ example: "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx", description: "UUID de la categoria padre", type: String })
    @IsString()
    @IsNotEmpty({ message: "El UUID de la categoria principal no puede estar vacio" })
    category_uuid: string;
};

export class PatchSubcategoryDTO extends PickType(Subcategories, ["description"] as const) {
    @ApiProperty({ example: "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx", description: "UUID de la categoria padre", type: String })
    @IsUUID()
    @IsNotEmpty({ message: "El UUID de la subcategoria objetivo no puede estar vacio" })
    uuid: string;
};

export class GetSubcategories extends OmitType(Subcategories, ["id", "category_id", "created_at", "father_id", "updated_at"] as const) { };