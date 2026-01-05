import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  imports: [PrismaModule, CacheModule]
})
export class MetricsModule { }
