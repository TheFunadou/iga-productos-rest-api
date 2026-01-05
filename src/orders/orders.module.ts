import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentModule } from './payment/payment.module';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OrderUtilsService } from './order.utils.service';
import { ProductVersionModule } from 'src/product-version/product-version.module';

@Module({
  providers: [OrdersService, OrderUtilsService],
  controllers: [OrdersController],
  imports: [PaymentModule, CacheModule, PrismaModule, ProductVersionModule],
  exports: [OrdersService]
})
export class OrdersModule { }
