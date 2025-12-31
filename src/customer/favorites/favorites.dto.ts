import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class ToggleFavoriteDTO {
    @ApiProperty({ description: "sku del producto", required: true })
    @IsString()
    @IsNotEmpty({ message: "El sku del producto no puede estar vacio" })
    sku: string;
};