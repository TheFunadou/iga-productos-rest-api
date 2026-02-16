import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OrdersDashboardParams } from 'src/orders/order.dto';
import { ShippingService } from './shipping.service';
import { GetShippingDashboard } from './shipping.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Get("dashboard")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ ORDERS: ["READ"] })
    @ApiOperation({ summary: "Obtiene el dashboard de envios" })
    @ApiResponse({ type: GetShippingDashboard, status: 200, description: "Dashboard de envios obtenido exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener el dashboard de envios" })
    @ApiResponse({ status: 401, description: "No autorizado" })
    @ApiResponse({ status: 403, description: "No autorizado" })
    @ApiResponse({ status: 404, description: "No autorizado" })
    @ApiResponse({ status: 500, description: "Error al obtener el dashboard de envios" })
    async dashboard(@Query() query: OrdersDashboardParams): Promise<GetShippingDashboard> {
        return await this.shippingService.dashboard({ query });
    };


};
