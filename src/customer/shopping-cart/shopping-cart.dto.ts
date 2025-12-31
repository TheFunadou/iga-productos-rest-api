import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ProductVersionCard } from "src/product-version/product-version.dto";

export class ShoppingCartDTO extends ProductVersionCard {
    @ApiProperty({ description: "Esta seleccionado?", example: true, required: true })
    @IsBoolean()
    isChecked: boolean;

    @ApiProperty({ description: "Cantidad", example: 1, required: true })
    @IsNumber()
    @IsInt()
    quantity: number;
};


export class UpdateItemQtyDTO {
    @ApiProperty({ description: "SKU del producto" })
    @IsString()
    @IsNotEmpty({ message: "El campo SKU no puede estar vacio" })
    @Type(() => String)
    sku: string;

    @ApiProperty({ description: "Cantidad a añadir (La cantidad ingresada se suma con la actual)" })
    @IsNotEmpty({ message: "El campo newQuantity no puede estar vacio" })
    @IsInt()
    @Type(() => Number)
    newQuantity: number;
};

export class ToggleCheckDTO {
    @ApiProperty({ description: "SKU del producto" })
    @IsString()
    @IsNotEmpty({ message: "El campo SKU no puede estar vacio" })
    @Type(() => String)
    sku: string;
};