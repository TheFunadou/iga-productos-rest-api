import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService],
  imports: [CacheModule, PrismaModule],
  exports: [ShippingService]
})
export class ShippingModule { }
