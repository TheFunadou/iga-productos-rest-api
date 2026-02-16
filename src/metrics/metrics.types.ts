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

export class DailySalesMetric {
    @ApiProperty({ example: "2024-04-01", description: "Fecha de la métrica" })
    date: string;

    @ApiProperty({ example: 10, description: "Número total de órdenes aprobadas en el día" })
    orders: number;

    @ApiProperty({ example: 1500.20, description: "Monto total de ventas aprobadas en el día" })
    amount: number;
}

