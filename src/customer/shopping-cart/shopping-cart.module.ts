import { Module } from '@nestjs/common';
import { ShoppingCartService } from './shopping-cart.service';
import { ShoppingCartController } from './shopping-cart.controller';
import { ShoppingCartUtilsService } from './shopping-cart.utils.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OffersModule } from 'src/offers/offers.module';
import { ProductVersionModule } from 'src/product-version/product-version.module';
import { ShoppingCartServiceV2 } from './domain/services/shopping-cart.service';

@Module({
  providers: [ShoppingCartService, ShoppingCartUtilsService, ShoppingCartServiceV2],
  controllers: [ShoppingCartController],
  imports: [CacheModule, PrismaModule, OffersModule, ProductVersionModule],
  exports: [ShoppingCartService, ShoppingCartServiceV2]
})
export class ShoppingCartModule { }
