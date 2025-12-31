import { Module } from '@nestjs/common';
import { ShoppingCartService } from './shopping-cart.service';
import { ShoppingCartController } from './shopping-cart.controller';
import { ShoppingCartUtilsService } from './shopping-cart.utils.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [ShoppingCartService, ShoppingCartUtilsService],
  controllers: [ShoppingCartController],
  imports: [CacheModule, PrismaModule]
})
export class ShoppingCartModule { }
