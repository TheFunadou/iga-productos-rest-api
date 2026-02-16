import { ApiProperty } from "@nestjs/swagger";

export class TotalCustomersDTO {
    @ApiProperty({ example: 100, description: "Número total de clientes registrados" })
    total_customers: number;
}

export class TotalApprovedOrdersDTO {
    @ApiProperty({ example: 50, description: "Número total de órdenes aprobadas" })
    total_approved_orders: number;
}

export class LowStockProductDTO {
    @ApiProperty({ example: "https://example.com/image.jpg", description: "URL de la imagen del producto" })
    image_url: string;

    @ApiProperty({ example: "Laptop Gamer X", description: "Nombre del producto" })
    product_name: string;

    @ApiProperty({ example: "SKU-12345", description: "SKU del producto" })
    sku: string;

    @ApiProperty({ example: 2, description: "Stock disponible" })
    stock: number;
}

export class LatestApprovedOrderDTO {
    @ApiProperty({ example: "uuid-12345", description: "UUID de la orden" })
    uuid: string;

    @ApiProperty({ example: "2024-02-14T12:00:00Z", description: "Fecha de actualización a estado APPROVED" })
    updated_at: Date;

    @ApiProperty({ example: 1500.50, description: "Monto total de la orden" })
    total_amount: number;
}

export class TopSellingProductDTO {
    @ApiProperty({ example: "https://example.com/image.jpg", description: "URL de la imagen del producto" })
    image_url: string;

    @ApiProperty({ example: "Electrónica", description: "Categoría del producto" })
    category: string;

    @ApiProperty({ example: "Smartphone Pro", description: "Nombre del producto" })
    product_name: string;

    @ApiProperty({ example: "SKU-98765", description: "SKU del producto" })
    sku: string;
}
