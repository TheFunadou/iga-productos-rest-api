import { Module } from '@nestjs/common';
import { ShoppingCartController } from './shopping-cart.controller';
import { ShoppingCartUtilsService } from './shopping-cart.utils.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OffersModule } from 'src/offers/offers.module';
import { ProductVersionModule } from 'src/product-version/product-version.module';
import { ShoppingCartService } from './domain/services/shopping-cart.service';

@Module({
  providers: [ShoppingCartService, ShoppingCartUtilsService],
  controllers: [ShoppingCartController],
  imports: [CacheModule, PrismaModule, OffersModule, ProductVersionModule],
  exports: [ShoppingCartService]
})
export class ShoppingCartModule { }
