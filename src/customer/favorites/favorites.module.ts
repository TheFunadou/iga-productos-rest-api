import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';
import { ProductVersionModule } from 'src/product-version/product-version.module';

@Module({
  providers: [FavoritesService],
  controllers: [FavoritesController],
  imports: [PrismaModule, CacheModule, ProductVersionModule]
})
export class FavoritesModule { }
