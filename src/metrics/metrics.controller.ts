import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from '../user_auth/user_auth.required.guard';
import { UserModulePermissionsGuard } from '../user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from '../user_auth/user_auth.module.permissions.decorator';
import {
    LatestApprovedOrderDTO,
    LowStockProductDTO,
    TopSellingProductDTO,
    TotalApprovedOrdersDTO,
    TotalCustomersDTO
} from './metrics.dto';
import { DailySalesMetric } from './metrics.types';

@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
@RequirePermissions({ E_COMMERCE_METRICS: ["READ"] })
export class MetricsController {
    constructor(
        private readonly metricsService: MetricsService,
    ) { };

    @Get('total-customers')
    @ApiOperation({ summary: 'Obtener el total de clientes registrados' })
    @ApiResponse({ status: 200, type: TotalCustomersDTO })
    @ApiResponse({ status: 400, description: 'Error al obtener el total de clientes registrados' })
    @ApiResponse({ status: 500, description: 'Error al obtener el total de clientes registrados' })
    @ApiQuery({ name: 'timeRange', required: false, enum: ['7d', '30d', '90d', '1y'], description: 'Rango de tiempo para el gráfico (default: 90d)' })
    async getTotalCustomers(): Promise<TotalCustomersDTO> {
        return await this.metricsService.getTotalCustomers();
    }

    @Get('total-approved-orders')
    @ApiOperation({ summary: 'Obtener el total de órdenes aprobadas' })
    @ApiResponse({ status: 200, type: TotalApprovedOrdersDTO })
    @ApiResponse({ status: 400, description: 'Error al obtener el total de órdenes aprobadas' })
    @ApiResponse({ status: 500, description: 'Error al obtener el total de órdenes aprobadas' })
    async getTotalApprovedOrders(): Promise<TotalApprovedOrdersDTO> {
        return await this.metricsService.getTotalApprovedOrders();
    }

    @Get('low-stock-products')
    @ApiOperation({ summary: 'Obtener productos con bajo stock' })
    @ApiResponse({ status: 200, type: [LowStockProductDTO] })
    @ApiResponse({ status: 400, description: 'Error al obtener productos con bajo stock' })
    @ApiResponse({ status: 500, description: 'Error al obtener productos con bajo stock' })
    async getLowStockProducts(): Promise<LowStockProductDTO[]> {
        return await this.metricsService.getLowStockProducts();
    }

    @Get('latest-approved-orders')
    @ApiOperation({ summary: 'Obtener las últimas órdenes aprobadas' })
    @ApiResponse({ status: 200, type: [LatestApprovedOrderDTO] })
    @ApiResponse({ status: 400, description: 'Error al obtener las últimas órdenes aprobadas' })
    @ApiResponse({ status: 500, description: 'Error al obtener las últimas órdenes aprobadas' })
    async getLatestApprovedOrders(): Promise<LatestApprovedOrderDTO[]> {
        return await this.metricsService.getLatestApprovedOrders();
    }

    @Get('top-selling-products')
    @ApiOperation({ summary: 'Obtener los productos más vendidos' })
    @ApiResponse({ status: 200, type: [TopSellingProductDTO] })
    @ApiResponse({ status: 400, description: 'Error al obtener los productos más vendidos' })
    @ApiResponse({ status: 500, description: 'Error al obtener los productos más vendidos' })
    async getTopSellingProducts(): Promise<TopSellingProductDTO[]> {
        return await this.metricsService.getTopSellingProducts();
    }

    @Get('sales-chart')
    @ApiOperation({ summary: 'Obtener datos para el gráfico de ventas' })
    @ApiQuery({
        name: 'timeRange',
        required: false,
        enum: ['7d', '30d', '90d', '1y'],
        description: 'Rango de tiempo para el gráfico (default: 90d)'
    })
    @ApiResponse({ status: 200, type: [DailySalesMetric] })
    @ApiResponse({ status: 400, description: 'Error al obtener los datos para el gráfico de ventas' })
    @ApiResponse({ status: 500, description: 'Error al obtener los datos para el gráfico de ventas' })
    @ApiQuery({ name: 'timeRange', required: false, enum: ['7d', '30d', '90d', '1y'], description: 'Rango de tiempo para el gráfico (default: 90d)' })
    async getSalesChartMetrics(
        @Query('timeRange') timeRange?: '7d' | '30d' | '90d' | '1y'
    ): Promise<DailySalesMetric[]> {
        return await this.metricsService.getSalesChartMetrics(timeRange);
    }
};
