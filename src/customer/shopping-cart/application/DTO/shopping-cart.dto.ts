import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator";

export class CartItemDTO {
    @ApiProperty({ description: "UUID del producto", example: "123e4567-e89b-12d3-a456-426614174000", required: true })
    @IsString()
    @IsNotEmpty({ message: "El campo productUUID no puede estar vacio" })
    @Type(() => String)
    productUUID: string;

    @ApiProperty({ description: "SKU del producto", example: "CAS-XXX-XXX", required: true })
    @IsString()
    @IsNotEmpty({ message: "El campo SKU no puede estar vacio" })
    @Type(() => String)
    sku: string;
};


export class ShoppingCartDTO {
    @ApiProperty({ description: "Item del carrito", example: "CAS-XXX-XXX", required: true })
    @Type(() => CartItemDTO)
    @ValidateNested()
    item: CartItemDTO;

    @ApiProperty({ description: "Cantidad", example: 1, required: true })
    @IsNumber()
    @IsInt()
    @Type(() => Number)
    quantity: number;

    @ApiProperty({ description: "Esta seleccionado?", example: true, required: true })
    @IsBoolean()
    @Type(() => Boolean)
    isChecked: boolean;
};

export class ToggleCheckV2DTO {
    @ApiProperty({ description: "SKU del producto a seleccionar/deseleccionar" })
    @IsString()
    @IsNotEmpty({ message: "El campo SKU no puede estar vacio" })
    sku: string;
};


export class SetItemDTO {
    @ApiProperty({ type: ShoppingCartDTO, description: "Item completo del carrito" })
    @ValidateNested()
    @Type(() => ShoppingCartDTO)
    item: ShoppingCartDTO;

    @ApiProperty({ description: "Tipo de operacion", example: "set", required: true })
    @IsString()
    @IsNotEmpty({ message: "El campo type no puede estar vacio" })
    @Type(() => String)
    type: "set" | "update";
}