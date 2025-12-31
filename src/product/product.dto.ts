import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { SafeCategory } from "src/categories/categories.dto";
import { GetProductVersion } from "src/product-version/product-version.dto";
import { SafeSubcategories } from "src/subcategories/subcategories.dto";

class Product {
    @ApiProperty({ example: 1, description: "ID del producto" })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", description: "UUID del producto" })
    uuid: string;

    @ApiProperty({ example: "IGA casco de seguridad", description: "Nombre del producto" })
    @IsNotEmpty({ message: "El nombre del producto no puede estar vacio" })
    @IsString()
    product_name: string;

    @ApiProperty({ example: 1, description: "ID de categoria de productos" })
    category_id: string;

    @ApiProperty({ example: "Descripción del producto", description: "Descripción del producto" })
    @IsNotEmpty({ message: "La descripción del producto no puede estar vacia" })
    @IsString()
    description: string;

    @ApiProperty({ example: "Especificaciones del producto", description: "Especificaciones del producto" })
    @IsNotEmpty({ message: "Las especificaciones del producto no pueden estar vacias" })
    @IsString()
    specs: string;

    @ApiProperty({ example: "Descripción de recomendaciones de uso", description: "Recomendaciones del producto" })
    @IsNotEmpty({ message: "Las recomendaciones del producto no pueden estar vacias" })
    @IsString()
    recommendations: string;

    @ApiProperty({ example: "Aplicaciones del producto", description: "Aplicaciones del producto" })
    @IsNotEmpty({ message: "Las aplicaciones del producto no pueden estar vacias" })
    @IsString()
    applications: string;

    @ApiProperty({ example: "Descripcion de certificaciones", description: "Descripcion de certificaciones" })
    @IsNotEmpty({ message: "La descripción de certificaciones no puede estar vacia" })
    @IsString()
    certifications_desc: string;

    @ApiProperty({ example: "2025-08-08 17:15:57.921", description: "Fecha y hora de creación" })
    @IsNotEmpty({ message: "La fecha de creación no puede estar vacia" })
    @IsDate()
    created_at: Date;

    @ApiProperty({ example: "2025-08-08 17:15:57.921", description: "Ultima fecha y hora de actualización" })
    @IsNotEmpty({ message: "La fecha de actualización no puede estar vacia" })
    @IsDate()
    updated_at: Date;

    @ApiProperty({ example: 1, description: "ID de usuario" })
    user_id: string;
};

export class SafeProduct extends OmitType(Product, ["id", "category_id", "user_id"] as const) { };
export class ProductAttributes extends OmitType(Product, ["id", "category_id", "created_at", "updated_at", "user_id", "uuid"] as const) { };

export class CreateProductDTO extends ProductAttributes {
    @ApiProperty({ description: "UUID de la categoria del producto", type: String })
    @IsUUID()
    category_uuid: string;

    @ApiProperty({ example: ["xxx", "yyy", "zzz"], isArray: true, description: "Subcategorias asociadas al producto" })
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => String)
    @IsString({ each: true })
    subcategories_path: string[];
};

export class PatchProductDTO extends PartialType(ProductAttributes) {
    @ApiProperty({ description: "UUID del producto", type: String })
    @IsString()
    uuid: string;

    @ApiProperty({ description: "UUID de la categoria del producto", type: String })
    @IsString()
    @IsOptional()
    category_uuid?: string;

    @ApiProperty({ example: ["xxx", "yyy", "zzz"], isArray: true, description: "Subcategorias asociadas al producto" })
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => String)
    @IsString({ each: true })
    @IsOptional()
    subcategories_path?: string[];
};

export class FatherProductUpdatedDto extends SafeProduct {
    @ApiProperty({ description: "Categoria del producto", type: SafeCategory })
    category: SafeCategory;

    @ApiProperty({ description: "Obtener subcategorias de un producto", type: [SafeCategory], isArray: true })
    subcategories: SafeSubcategories[];
};

export class SearchedProducts {
    @ApiProperty({ example: "1", description: "UUID del producto" })
    uuid: string;

    @ApiProperty({ example: "Cascos", description: "Categoria de productos" })
    category: string;

    @ApiProperty({ example: "Iga casco de seguridad industrial", description: "Nombre del producuto" })
    product_name: string;

    @ApiProperty({ example: "Cascos - Cascos de seguridad industrial ...", description: "Subcategorias del producto" })
    subcategories: string;

    // @ApiProperty({ example: "http://image.url", description: "Url de la imagen de producto" })
    // image_url: string;

    @ApiProperty({ example: "John doe", description: "Username del creador del producto" })
    user: string;

    @ApiProperty({ example: "2025-08-08 17:15:57.921", description: "Fecha y hora de creación" })
    created_at: Date;

    @ApiProperty({ example: "2025-08-08 17:15:57.921", description: "Fecha y hora de creación" })
    updated_at: Date;
};


export class ProductDetail {
    @ApiProperty({ description: "Información del producto", type: SafeProduct })
    @Type(() => SafeProduct)
    product: SafeProduct;

    @ApiProperty({ description: "UUID de la categoria del producto", type: "string" })
    category_uuid: string;

    @ApiProperty({ description: "Categoria del producto", type: "string" })
    category: string;

    @ApiProperty({ description: "Subcategorias del producto", type: "array" })
    subcategories: { uuid: string, description: string }[];

    @ApiProperty({ description: "Creador", type: "string" })
    created_by: string;

    @ApiProperty({ description: "Versiones del producto", type: [GetProductVersion] as const })
    @Type(() => GetProductVersion)
    versions: GetProductVersion[];
};






