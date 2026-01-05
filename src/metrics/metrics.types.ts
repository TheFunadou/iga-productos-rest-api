import { ApiProperty } from "@nestjs/swagger";
import { TinyProductVersionAttributes } from "src/product-version/product-version.dto";
import { ProductTinyDetail } from "src/product/product.dto";


export class DashboardCountMetrics {
    @ApiProperty({ example: 10 })
    customersCount: number;

    @ApiProperty({ example: 10 })
    ordersCount: number;
};

export class DashboardMostPopularItems {
    @ApiProperty({ type: ProductTinyDetail })
    product: ProductTinyDetail;

    @ApiProperty({ type: TinyProductVersionAttributes })
    product_version: TinyProductVersionAttributes;

    @ApiProperty({ example: "https://example.com/image.jpg" })
    image: string;

    @ApiProperty({ example: 10 })
    totalQuantitySold: number;

    @ApiProperty({ example: 5 })
    totalOrders: number;
};
