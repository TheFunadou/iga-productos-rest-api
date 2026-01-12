import { ApiProperty, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { Decimal } from "@prisma/client/runtime/index-browser";
import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsDecimal, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { ProductAttributes } from "src/product/product.dto";
import { GetSubcategories } from "src/subcategories/subcategories.dto";

class ProductVersion {
    @ApiProperty({ example: 1, description: "ID del producto" })
    id: number;

    @ApiProperty({ example: 1, description: "ID de producto padre" })
    product_id: number;

    @ApiProperty({ example: 1, description: "SKU del prodcuto" })
    @IsNotEmpty({ message: "The sku field cannot be empty" })
    @IsString()
    @Type(() => String)
    sku: string;

    @ApiProperty({ example: 1, description: "Codigo de barras del producto" })
    @IsString()
    @Type(() => String)
    @IsOptional()
    @Transform(({ value }) => (value === "" ? null : value))
    code_bar?: string | null;

    @ApiProperty({ example: "Linea Basica", description: "Linea de color del producto" })
    @IsString()
    @IsNotEmpty({ message: "The color_line field cannot be empty" })
    color_line: string;

    @ApiProperty({ example: "amarillo", description: "Nombre de color" })
    @IsString()
    @IsNotEmpty({ message: "The color_name field cannot be empty" })
    color_name: string;

    @ApiProperty({ example: "#edf500", description: "Codigo de color" })
    @IsNotEmpty({ message: "The color_code field cannot be empty" })
    color_code: string;

    @ApiProperty({ example: "DISPONIBLE", description: "Estatus del producto" })
    @IsString()
    @IsNotEmpty({ message: "The status field cannot be empty" })
    status: string;

    @ApiProperty({ example: 15, description: "Numero de piezas disponibles del producto" })
    @IsNotEmpty({ message: "The stock field cannot be empty" })
    @IsNumber()
    @Type(() => Number)
    stock: number;

    @ApiProperty({
        description: "Precio del producto",
        example: "99.99",
        type: "string",
    })
    @IsDecimal(
        { decimal_digits: "1,2" },
        { message: "El precio debe tener máximo 2 decimales" }
    )
    unit_price: string | Decimal;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    technical_sheet_url: string;

    @ApiProperty({ example: "2025-08-08 17:15:57.921", description: "Fecha y hora de creación" })
    @IsNotEmpty({ message: "The created_at field cannot be empty" })
    @IsDate()
    created_at: Date;

    @ApiProperty({ example: "2025-08-08 17:15:57.921", description: "Ultima fecha y hora de actualización" })
    @IsNotEmpty({ message: "The updated_at field cannot be empty" })
    @IsDate()
    updated_at: Date;

    @ApiProperty({ example: true, description: "Este version de prodcuto, es la principa?" })
    @IsNotEmpty({ message: "The color_code field cannot be empty" })
    @IsBoolean()
    main_version: boolean;
};
export class SafeProductVersion extends OmitType(ProductVersion, ["id", "product_id"] as const) { };
export class ProductVersionAttributes extends OmitType(ProductVersion, ["id", "product_id", "created_at", "updated_at"] as const) { };
export class SafeProductVersionAttributes extends OmitType(ProductVersion, ["id", "product_id", "created_at", "updated_at", "main_version"] as const) { };
export class TinyProductVersionAttributes extends PickType(ProductVersion, ["sku", "color_code", "color_name", "color_code"] as const) { };

export class ProductVersionImages {
    @ApiProperty({ example: 1, description: "ID del recurso" })
    id: number;

    @ApiProperty({ example: 5, description: "ID del producto" })
    product_version_id: number;

    @ApiProperty({ example: "https://igaproductos.com.mx/wp-content/uploads/2024/07/Amarillo_003.jpg", description: "URL de imagen producto" })
    @IsString()
    @IsNotEmpty({ message: "La URL de la imagen no puede estar vacia" })
    image_url: string;

    @ApiProperty({ example: true, description: "Es la imagen principal del producto?" })
    @IsBoolean()
    main_image: boolean;
};
export class SafeProductVersionImages extends OmitType(ProductVersionImages, ["id", "product_version_id"] as const) { };
export class SafeTinyProductVersionImages extends PickType(ProductVersionImages, ["image_url"] as const) { };
export class CreateProductVersionDTO extends ProductVersionAttributes {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", description: "UUID del producto padre" })
    @IsString()
    @IsNotEmpty({ message: "The father_uuid field cannot be empty" })
    @Type(() => String)
    father_uuid: string;

    @ApiProperty({ description: "Imagenes del producto", type: [SafeProductVersionImages] as const, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SafeProductVersionImages)
    version_images: SafeProductVersionImages[];
};

export class PatchProductVersionDTO extends PartialType(CreateProductVersionDTO) { };

export class GetProductVersion extends SafeProductVersion {
    version_images: SafeProductVersionImages[];
};


class ParentVersions extends PickType(ProductVersion, ["sku", "unit_price"] as const) {
    @ApiProperty({ example: 10, description: "Descuento del producto" })
    discount?: number;
    @ApiProperty({ example: [{ "image_url": "https://igaproductos.com.mx/wp-content/uploads/2024/07/Amarillo_003.jpg" }], description: "Imagenes del producto" })
    product_images: { image_url: string }[];
};

export class ProductVersionDetail {
    @ApiProperty({ description: "Información del producto padre", type: ProductAttributes })
    product: ProductAttributes;

    @ApiProperty({
        description: "Obtener subcategorias de un producto",
        type: [String],
        isArray: true,
        example: ["subcategoria 1", "subcategoria 2", "subcategoria 3"]
    })
    @IsArray()
    @Type(() => String)
    subcategories: string[];

    @ApiProperty({ description: "Información de version de producto", type: SafeProductVersionAttributes })

    product_version: SafeProductVersionAttributes;

    @ApiProperty({ description: "Imagenes del producto", type: SafeProductVersionImages, isArray: true })
    product_images: SafeProductVersionImages[];

    @ApiProperty({ description: "Categoria del prodcuto" })
    @IsString()
    category: string;

    @ApiProperty({ description: "Parientes similares de la version del producto", type: ParentVersions, isArray: true })
    parent_versions?: ParentVersions[];

    @ApiProperty({ description: "Producto en oferta?", required: false })
    @IsBoolean()
    @IsOptional()
    isOffer?: boolean;

    @ApiProperty({ description: "porcentaje de descuento", required: false })
    @IsNumber()
    @IsOptional()
    discount?: number;

    @ApiProperty({ description: "Es favorito?", required: false })
    @IsBoolean()
    @IsOptional()
    isFavorite?: boolean;
};

class ProductVersionCardAttributes extends OmitType(ProductVersion, ["id", "product_id", "created_at", "updated_at", "status", "main_version", "technical_sheet_url"] as const) { };

export class ProductVersionCard extends OmitType(ProductVersionDetail, ["product", "product_version", "product_images", "parent_versions"] as const) {
    @ApiProperty({ type: String, example: "Nombre producto" })
    @IsString()
    @IsNotEmpty({ message: "El nombre del producto no puede estar vacio" })
    product_name: string;

    @ApiProperty({ type: String, example: "Nombre categoria" })
    @IsString()
    @IsNotEmpty({ message: "El nombre de la categoria no puede estar vacio" })
    category: string;

    @ApiProperty({ type: ProductVersionCardAttributes })
    @IsObject()
    @ValidateNested()
    @Type(() => ProductVersionCardAttributes)
    product_version: ProductVersionCardAttributes;

    @ApiProperty({ type: SafeProductVersionImages, isArray: true })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SafeProductVersionImages)
    product_images: SafeProductVersionImages[];
};

export class GetProductVersionCards {
    @ApiProperty({ description: "Arreglo con las tarjetas de versiones de productos" })
    data: ProductVersionCard[];

    @ApiProperty({ description: "Total de registros encontrados en la base de datos" })
    totalRecords: number;

    @ApiProperty({ description: "Total de paginas" })
    totalPages: number;
};

export class GetProductVersionFavCards extends OmitType(ProductVersionCard, ["isFavorite"] as const) {
    @ApiProperty({ example: "2025-10-20" })
    agg_date: Date;
};

export class SearchProductVersionsDTO {
    @ApiProperty({ description: "Nombre del producto", example: "IGA Casco de Seguridad" })
    product_name: string;

    @ApiProperty({ description: "Color del producto", example: "Amarillo" })
    color: string;

    @ApiProperty({ description: "Categoria del producto", example: "Cascos" })
    category: string;

    @ApiProperty({ description: "SKU del producto", example: "XXXXXX" })
    sku: string;
};

export class ProductVersionCardsFiltersDTO {
    @ApiProperty({ description: "pagina" })
    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    page?: number;

    @ApiProperty({ description: "limite" })
    @IsNumber()
    @Type(() => Number)
    limit: number;//

    @ApiProperty({ description: "Obtenter favoritos del cliente" })
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    onlyFavorites?: boolean;

    @ApiProperty({ description: "Nombre de la categoria" })
    @IsString()
    @IsOptional()
    @Type(() => String)
    category?: string; //

    @ApiProperty({ description: "Arreglo de ID de subcategorias" })
    @IsArray()
    @Type(() => String)
    @IsString({ each: true })
    @IsOptional()
    @Transform(({ value }) => {
        if (Array.isArray(value)) {
            return value.map(String);
        }

        return [String(value)];
    })
    subcategoryPath?: string[];


    @ApiProperty({ description: "Obtener ofertas" })
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    onlyOffers?: boolean;

    @ApiProperty({ description: "Mas caros" })
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    moreExpensive?: boolean;
};


export class GetProductVersionCardsRandomOptionsDTO {
    @ApiProperty({ description: "Limite de objetos recueperados MAX 25" })
    @IsInt()
    @Type(() => Number)
    limit: number;

    @ApiProperty({ description: "Entidad para el cache", required: false })
    @IsString()
    @IsOptional()
    entity?: string;
};

export class ProductVersionReviews {
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

export class ProductVersionReviewsAttributes extends PickType(ProductVersionReviews, ["rating", "title", "comment"] as const) { };

export class GetProductVersionReviews extends OmitType(ProductVersionReviews, ["id", "product_version_id", "customer_id"] as const) {
    @ApiProperty({ description: "Informacion del cliente", type: String })
    customer: string;

    @ApiProperty({ description: "Cantidad total de reseñas" })
    totalRecords: number;

    @ApiProperty({ description: "Cantidad total de paginas" })
    totalPages: number;

};

export class GetPVReviewRating {
    @ApiProperty({ description: "Calificacion" })
    rating: number;

    @ApiProperty({ description: "Porcentaje" })
    percentage: number;
}

export class ProductVersionReviewsVersionAttributes extends PickType(ProductVersion, ["sku", "color_name", "color_code", "color_line"] as const) {

    @ApiProperty({ description: "Imagenes de la version del producto", type: SafeTinyProductVersionImages, isArray: true })
    @Type(() => SafeTinyProductVersionImages)
    @ValidateNested({ each: true })
    product_version_images: SafeTinyProductVersionImages[];

    @ApiProperty({ description: "Nombre de la categoria" })
    category_name: string;

    @ApiProperty({ description: "Arreglo de nombres de subcategorias", type: String, isArray: true })
    subcategories: string[];
};
