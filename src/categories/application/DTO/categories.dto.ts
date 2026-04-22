import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class CreateCategoryDTO {
    @ApiProperty({ description: "Nombre de la categoria", example: "Cascos", type: "string" })
    @IsString()
    @IsNotEmpty()
    name: string;
};

export class PatchCategoryDTO extends PartialType(CreateCategoryDTO) {
    @ApiProperty({ description: "UUID de la categoria", example: "xxx-xxx-xxx", type: "string" })
    @IsString()
    @IsNotEmpty()
    uuid: string;
};
