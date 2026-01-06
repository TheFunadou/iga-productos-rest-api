import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardCountMetrics, DashboardMostPopularItems } from './metrics.types';

@Injectable()
export class MetricsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { };

    async dashboardCountMetrics(): Promise<DashboardCountMetrics> {
        const customersCount = await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:dashboard:customers:count",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12,
            },
            fallback: async () => { return await this.prisma.customer.count(); }
        });

        const ordersCount = await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:dashboard:orders:count",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12,
            },
            fallback: async () => { return await this.prisma.order.count(); }
        });

        return { customersCount, ordersCount };
    };


    /**
     * Obtiene los productos más populares basándose en la cantidad total vendida
     * en órdenes pagadas (status = "paid")
     */
    async dashboardMostPopularItems(): Promise<DashboardMostPopularItems[]> {
        return await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:dashboard:most-popular-items",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12,
            },
            fallback: async () => {
                // Primero, obtenemos los IDs de las versiones más vendidas usando agregación
                const topProductVersions = await this.prisma.orderItemsDetails.groupBy({
                    by: ['product_version_id'],
                    where: {
                        order: {
                            status: 'paid' // Solo órdenes pagadas
                        }
                    },
                    _sum: {
                        quantity: true // Suma total de unidades vendidas
                    },
                    _count: {
                        order_id: true // Número de órdenes en las que aparece
                    },
                    orderBy: {
                        _sum: {
                            quantity: 'desc' // Ordenar por cantidad total vendida
                        }
                    },
                    take: 5
                });

                // Luego, obtenemos los detalles completos de esas versiones
                const productVersionIds = topProductVersions.map(item => item.product_version_id);

                const productDetails = await this.prisma.productVersion.findMany({
                    where: { id: { in: productVersionIds } },
                    select: {
                        id: true,
                        sku: true,
                        color_line: true,
                        color_code: true,
                        color_name: true,
                        unit_price: true,
                        product: {
                            select: {
                                product_name: true,
                                subcategories: {
                                    select: {
                                        subcategories: {
                                            select: {
                                                description: true,
                                                level: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        product_version_images: {
                            where: { main_image: true },
                            select: {
                                image_url: true,
                                main_image: true
                            },
                            take: 1
                        }
                    }
                });

                // Combinamos los datos de ventas con los detalles del producto
                const result = productDetails.map(product => {
                    const salesData = topProductVersions.find(item => item.product_version_id === product.id);
                    return {
                        product: {
                            product_name: product.product.product_name,
                            subcategories: product.product.subcategories.map(sub => sub.subcategories.description)
                        },
                        product_version: {
                            sku: product.sku,
                            color_line: product.color_line,
                            color_code: product.color_code,
                            color_name: product.color_name,
                            unit_price: product.unit_price
                        },
                        image: product.product_version_images[0].image_url,
                        totalQuantitySold: salesData?._sum.quantity || 0,
                        totalOrders: salesData?._count.order_id || 0
                    };
                });

                // Ordenamos el resultado final por cantidad vendida
                result.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

                return result;
            }
        });
    };

    async salesLastTwoMonths() {
        return await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "metrics:dashboard:sales:last-two-months",
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12,
            },
            fallback: async () => {

            }
        })
    };
};
