import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditListener } from './audit.listener';
import { AuditController } from './audit.controller';
import { CacheModule } from 'src/cache/cache.module';
import { AuditService } from './audit.service';

@Module({
  providers: [AuditListener, AuditService],
  imports: [PrismaModule, CacheModule],
  controllers: [AuditController]
})
export class AuditModule { }
