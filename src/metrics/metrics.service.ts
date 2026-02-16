import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DailySalesMetric, DashboardCountMetrics, DashboardMostPopularItems } from './metrics.types';
import { LatestApprovedOrderDTO, LowStockProductDTO, TopSellingProductDTO, TotalApprovedOrdersDTO, TotalCustomersDTO } from './metrics.dto';

@Injectable()
export class MetricsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { };

    async getTotalCustomers(): Promise<TotalCustomersDTO> {
        return await this.cache.remember<TotalCustomersDTO>({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:total_customers",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60, // 1 hour
                staleTimeMilliseconds: 1000 * 60 * 30
            },
            fallback: async () => {
                const total = await this.prisma.customer.count();
                return { total_customers: total };
            }
        });
    }

    async getTotalApprovedOrders(): Promise<TotalApprovedOrdersDTO> {
        return await this.cache.remember<TotalApprovedOrdersDTO>({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:total_approved_orders",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60, // 1 hour
                staleTimeMilliseconds: 1000 * 60 * 30
            },
            fallback: async () => {
                const total = await this.prisma.order.count({
                    where: { status: "APPROVED" }
                });
                return { total_approved_orders: total };
            }
        });
    }

    async getLowStockProducts(): Promise<LowStockProductDTO[]> {
        return await this.cache.remember<LowStockProductDTO[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:low_stock_products",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 30, // 30 min
                staleTimeMilliseconds: 1000 * 60 * 15
            },
            fallback: async () => {
                const products = await this.prisma.productVersion.findMany({
                    take: 5,
                    orderBy: { stock: "asc" },
                    include: {
                        product: { select: { product_name: true } },
                        product_version_images: {
                            where: { main_image: true },
                            take: 1,
                            select: { image_url: true }
                        }
                    }
                });

                return products.map(p => ({
                    image_url: p.product_version_images[0]?.image_url || "",
                    product_name: p.product.product_name,
                    sku: p.sku,
                    stock: p.stock
                }));
            }
        });
    }

    async getLatestApprovedOrders(): Promise<LatestApprovedOrderDTO[]> {
        return await this.cache.remember<LatestApprovedOrderDTO[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:latest_approved_orders",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15, // 15 min
                staleTimeMilliseconds: 1000 * 60 * 10
            },
            fallback: async () => {
                const orders = await this.prisma.order.findMany({
                    where: { status: "APPROVED" },
                    take: 5,
                    orderBy: { updated_at: "desc" },
                    select: {
                        uuid: true,
                        updated_at: true,
                        total_amount: true
                    }
                });

                return orders.map(o => ({
                    uuid: o.uuid,
                    updated_at: o.updated_at,
                    total_amount: Number(o.total_amount)
                }));
            }
        });
    }

    async getTopSellingProducts(): Promise<TopSellingProductDTO[]> {
        return await this.cache.remember<TopSellingProductDTO[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:top_selling_products",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60 * 24, // 24 hours
                staleTimeMilliseconds: 1000 * 60 * 60 * 12
            },
            fallback: async () => {
                const topProducts = await this.prisma.orderItemsDetails.groupBy({
                    by: ["product_version_id"],
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: "desc" } },
                    take: 5,
                    where: {
                        order: { status: "APPROVED" } // Filtering by related field in groupBy requires explicit Relation Filter
                    }
                });

                const productIds = topProducts.map(p => p.product_version_id);

                if (productIds.length === 0) return [];

                const productsDetails = await this.prisma.productVersion.findMany({
                    where: { id: { in: productIds } },
                    include: {
                        product: {
                            select: {
                                product_name: true,
                                category: { select: { name: true } }
                            }
                        },
                        product_version_images: {
                            where: { main_image: true },
                            take: 1,
                            select: { image_url: true }
                        }
                    }
                });

                // Map to keep order of top selling based on aggregation
                const detailsMap = new Map(productsDetails.map(p => [p.id, p]));

                return productIds.map(id => {
                    const details = detailsMap.get(id);
                    if (!details) return null;
                    return {
                        image_url: details.product_version_images[0]?.image_url || "",
                        category: details.product.category.name,
                        product_name: details.product.product_name,
                        sku: details.sku
                    };
                }).filter((p): p is TopSellingProductDTO => p !== null);
            }
        });
    }

    async getSalesChartMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '90d'): Promise<DailySalesMetric[]> {
        return await this.cache.remember<DailySalesMetric[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:sales_chart",
            query: { timeRange },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60 * 4, // 4 hours
                staleTimeMilliseconds: 1000 * 60 * 60 * 2
            },
            fallback: async () => {
                const now = new Date();
                const startDate = new Date();

                switch (timeRange) {
                    case '7d':
                        startDate.setDate(now.getDate() - 7);
                        break;
                    case '30d':
                        startDate.setDate(now.getDate() - 30);
                        break;
                    case '90d':
                        startDate.setDate(now.getDate() - 90);
                        break;
                    case '1y':
                        startDate.setFullYear(now.getFullYear() - 1);
                        break;
                    default:
                        startDate.setDate(now.getDate() - 90);
                }

                // Asegurarse de comenzar desde el principio del día para incluir todas las ventas de la fecha de inicio
                startDate.setHours(0, 0, 0, 0);

                const orders = await this.prisma.order.findMany({
                    where: {
                        status: "APPROVED",
                        updated_at: {
                            gte: startDate
                        }
                    },
                    select: {
                        updated_at: true,
                        total_amount: true
                    }
                });

                const groupedData = new Map<string, { orders: number, amount: number }>();

                // Helper to format date YYYY-MM-DD
                const formatDate = (date: Date) => date.toISOString().split('T')[0];

                const currentDate = new Date(startDate);
                const endDate = new Date();

                while (currentDate <= endDate) {
                    const day = formatDate(currentDate);
                    groupedData.set(day, { orders: 0, amount: 0 });
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                orders.forEach(order => {
                    const day = formatDate(order.updated_at);

                    if (groupedData.has(day)) {
                        const entry = groupedData.get(day)!;
                        entry.orders += 1;
                        entry.amount += Number(order.total_amount);
                    }
                });

                const result = Array.from(groupedData.entries()).map(([date, values]) => ({
                    date,
                    orders: values.orders,
                    amount: Number(values.amount.toFixed(2))
                })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                return result;
            }
        });
    }
};
