import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { DashboardCommonQueryDTO } from 'src/common/DTO/common.dto';
import { UserLogsDashboard } from './application/interfaces/audit.interface';

@Controller('audit')
export class AuditController {

    constructor(
        private readonly auditService: AuditService
    ) { };

    @Get()
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ USERS: ["READ"] })
    async dashboard(@Query() query: DashboardCommonQueryDTO): Promise<UserLogsDashboard> {
        return await this.auditService.dashboard({ query });
    };
};
