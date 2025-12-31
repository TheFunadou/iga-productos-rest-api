import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentModule } from './payment/payment.module';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductVersionFindService } from 'src/product-version/product-version.find.service';
import { OrderUtilsService } from './order.utils.service';

@Module({
  providers: [OrdersService, OrderUtilsService],
  controllers: [OrdersController],
  imports: [PaymentModule, CacheModule, PrismaModule, ProductVersionFindService],
  exports: [OrdersService]
})
export class OrdersModule { }
