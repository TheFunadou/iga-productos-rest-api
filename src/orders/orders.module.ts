import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentModule } from './payment/payment.module';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductVersionModule } from 'src/product-version/product-version.module';
import { OffersModule } from 'src/offers/offers.module';
import { CreateOrderService } from './domain/services/create-order.service';
import { CreateOrderStrategyFactory } from './domain/factories/create-order.factory';
import { MercadoPagoProvider } from './providers/mercado-pago.provider';
import { CqrsModule } from '@nestjs/cqrs';
import { MercadoPagoStrategy } from './domain/strategies/create-order.strategy';
import { CreateOrderHandler } from './domain/commands/create-order/create-order.handler';

@Module({
  providers: [
    OrdersService,
    CreateOrderService,
    CreateOrderStrategyFactory,
    MercadoPagoProvider,
    MercadoPagoStrategy,
    CreateOrderHandler
  ],
  controllers: [OrdersController],
  imports: [
    PaymentModule,
    CacheModule,
    PrismaModule,
    ProductVersionModule,
    OffersModule,
    CqrsModule
  ],
  exports: [OrdersService, MercadoPagoProvider]
})
export class OrdersModule { }
