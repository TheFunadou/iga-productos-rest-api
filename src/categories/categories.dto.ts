import { ApiProperty, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { SafeTinyProductVersionImages } from "src/product-version/product-version.dto";


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

export class SummaryPVCategories {
    @ApiProperty({ description: "SKU del producto", example: "xxx-xxx-xxx", type: "string" })
    sku: string;

    @ApiProperty({ description: "Nombre del producto" })
    productName: string;

    @ApiProperty({ description: "URL de la imagen", example: "https://example.com/image.jpg", type: "string" })
    imageUrl: string;
};

export class SummaryCategories {
    @ApiProperty({ description: "Nombre de la categoria", example: "Cascos", type: "string" })
    categoryName: string;
    @ApiProperty({
        description: "Versiones del producto", type: [SummaryPVCategories], example: {
            categoryName: "Cascos",
            product_versions: [
                {
                    sku: "xxx-xxx-xxx",
                    image_url: "https://example.com/image.jpg"
                }
            ]
        }
    })
    productVersion: SummaryPVCategories[];
};
