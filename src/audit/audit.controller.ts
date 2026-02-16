import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { OrdersDashboardParams as EventsDashboardParams } from "src/orders/order.dto";
import { GetUserLogsDashboard } from './audit.dto';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';

@Controller('audit')
export class AuditController {

    constructor(
        private readonly auditService: AuditService
    ) { };

    @Get()
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ USERS: ["READ"] })
    async dashboard(@Query() query: EventsDashboardParams): Promise<GetUserLogsDashboard> {
        return await this.auditService.dashboard({ query });
    };
};
