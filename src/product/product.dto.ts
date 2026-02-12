import { ApiProperty, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { SafeCategory } from "src/categories/categories.dto";
import { PaginationDTO } from "src/common/DTO/pagination.dto";
import { GetProductVersion, ProductVersion, SafeTinyProductVersionImages } from "src/product-version/product-version.dto";
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
export class ProductAttributesWithUUID extends OmitType(Product, ["id", "category_id", "created_at", "updated_at", "user_id"] as const) { };
export class ProductTinyDetail extends PickType(Product, ["product_name"] as const) {
    @ApiProperty({ description: "Subcategorias del producto" })
    subcategories: string[];
};

export class CreateProductDTO extends ProductAttributes {
    @ApiProperty({ description: "UUID de la categoria del producto", type: String })
    @IsString()
    category_uuid: string;

    @ApiProperty({
        example: ["xxx", "yyy", "zzz"],
        type: [String], // Es más explícito para Swagger
        description: "Subcategorias asociadas al producto"
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @Transform(({ value }) => {
        // Si recibes un string (ej. desde un form-data) lo convierte a array
        if (typeof value === 'string') {
            return value.split(',').map(s => s.trim());
        }
        return value;
    })
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

export class ProductReviews {
    @ApiProperty({ description: "ID de la review" })
    id: string;

    @ApiProperty({ description: "UUID del cliente" })
    uuid: string;

    @ApiProperty({ description: "ID de la version del producto" })
    product_version_id: string;

    @ApiProperty({ description: "ID del cliente" })
    customer_id: string;

    @ApiProperty({ description: "Calificacion" })
    @IsInt()
    @IsNotEmpty({ message: "La calificacion no puede estar vacia" })
    rating: number;

    @ApiProperty({ description: "Titulo" })
    @IsString()
    @IsNotEmpty({ message: "El titulo no puede estar vacio" })
    title: string;

    @ApiProperty({ description: "Comentario" })
    @IsString()
    @IsNotEmpty({ message: "El comentario no puede estar vacio" })
    comment: string;

    @ApiProperty({ description: "Fecha de creacion" })
    created_at: Date;
};

export class ProductReviewsAttributes extends PickType(ProductReviews, ["rating", "title", "comment"] as const) { };

export class ProductCustomerReview extends OmitType(ProductReviews, ["id", "product_version_id", "customer_id"] as const) {
    @ApiProperty({ description: "Informacion del cliente", type: String })
    customer: string;
};

export class GetProductReviews {
    @ApiProperty({ description: "Arreglo con las reseñas", type: ProductCustomerReview, isArray: true })
    reviews: ProductCustomerReview[];
    @ApiProperty({ description: "Total de registros encontrados en la base de datos" })
    totalRecords: number;
    @ApiProperty({ description: "Total de paginas" })
    totalPages: number;
};


export class GetProductReviewRating {
    @ApiProperty({ description: "Calificacion" })
    rating: number;

    @ApiProperty({ description: "Porcentaje" })
    percentage: number;
};


export class GetProductReviewResume {
    @ApiProperty({ description: "Arreglo con las calificaciones" })
    ratingResume: GetProductReviewRating[];
    @ApiProperty({ description: "Calificacion promedio" })
    ratingAverage: number;
    @ApiProperty({ description: "Cantidad total de reseñas" })
    totalReviews: number;
};


export class ProductReviewsVersionAttributes extends PickType(ProductVersion, ["sku", "color_name", "color_code", "color_line"] as const) {
    @ApiProperty({ description: "Imagenes de la version del producto", type: SafeTinyProductVersionImages, isArray: true })
    @Type(() => SafeTinyProductVersionImages)
    @ValidateNested({ each: true })
    product_version_images: SafeTinyProductVersionImages[];

    @ApiProperty({ description: "Nombre de la categoria" })
    category_name: string;

    @ApiProperty({ description: "Arreglo de nombres de subcategorias", type: String, isArray: true })
    subcategories: string[];
};

export class ProductReviewsAttributesWithDateAndUUID extends PickType(ProductReviews, ["title", "comment", "rating", "created_at", "uuid"] as const) { };
export class GetReviewsData extends ProductReviewsAttributesWithDateAndUUID {

    @ApiProperty({ description: "UUID de la reseña", type: String })
    uuid: string;

    @ApiProperty({ description: "Informacion del cliente", type: String })
    customer: string;

    @ApiProperty({ description: "SKU del producto", type: String })
    sku: string;

    @ApiProperty({ description: "Nombre del producto", type: String })
    product_name: string;

    @ApiProperty({ description: "URL de la imagen del producto", type: String })
    image_url: string;
}
export class GetDashboardReviews {
    @ApiProperty({ description: "Arreglo con las reseñas", type: GetReviewsData, isArray: true })
    @Type(() => GetReviewsData)
    data: GetReviewsData[];

    @ApiProperty({ description: "Total de registros encontrados en la base de datos" })
    totalRecords: number;

    @ApiProperty({ description: "Total de paginas" })
    totalPages: number;
};





