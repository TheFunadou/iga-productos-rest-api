import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { UpdateShippingDTO } from './application/DTO/shipping.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { OrdersDashboardParams } from 'src/orders/payment/application/DTO/order.dto';
import { ShippingDashboardI } from './application/interfaces/shipping.interfaces';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Get("dashboard")
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ ORDERS: ["READ"] })
    @ApiOperation({ summary: "Obtiene el dashboard de envios" })
    @ApiResponse({ status: 200, description: "Dashboard de envios obtenido exitosamente" })
    @ApiResponse({ status: 400, description: "Error al obtener el dashboard de envios" })
    @ApiResponse({ status: 401, description: "No autorizado" })
    @ApiResponse({ status: 403, description: "No autorizado" })
    @ApiResponse({ status: 404, description: "No autorizado" })
    @ApiResponse({ status: 500, description: "Error al obtener el dashboard de envios" })
    async dashboard(@Query() query: OrdersDashboardParams): Promise<ShippingDashboardI> {
        return await this.shippingService.dashboard({ query });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ ORDERS: ["UPDATE"] })
    @ApiOperation({ summary: "Actualizar una orden de envio" })
    @ApiResponse({ status: 400, description: "Error al obtener el dashboard de envios" })
    @ApiResponse({ status: 401, description: "No autenticado" })
    @ApiResponse({ status: 403, description: "No autorizado" })
    @ApiResponse({ status: 404, description: "Error" })
    @ApiResponse({ status: 500, description: "Error" })
    async updateShipping(@Body() dto: UpdateShippingDTO) {
        return await this.shippingService.updateShipping({ dto });
    }


};
