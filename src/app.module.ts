import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { CustomerAuthModule } from './customer_auth/customer_auth.module';
import { UserAuthModule } from './user_auth/user_auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from './cache/cache.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { ProductModule } from './product/product.module';
import { BullModule } from '@nestjs/bullmq';
import { redisConfig } from './redis.config';
import { ProductVersionModule } from './product-version/product-version.module';
import { CustomerModule } from './customer/customer.module';
import { ECommerceModule } from './e-commerce/e-commerce.module';
import { OrdersModule } from './orders/orders.module';
import { OffersModule } from './offers/offers.module';
import { MetricsModule } from './metrics/metrics.module';
import { ShippingModule } from './shipping/shipping.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 15, }]),
    BullModule.forRoot({ connection: redisConfig }),
    PrismaModule,
    UserModule,
    CustomerAuthModule,
    UserAuthModule,
    CacheModule,
    CategoriesModule,
    SubcategoriesModule,
    ProductModule,
    ProductVersionModule,
    CustomerModule,
    ECommerceModule,
    OrdersModule,
    OffersModule,
    MetricsModule,
    ShippingModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserService],
})
export class AppModule { }
