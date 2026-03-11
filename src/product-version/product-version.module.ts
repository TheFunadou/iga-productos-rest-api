import { Module } from '@nestjs/common';
import { ProductVersionController } from './product-version.controller';
import { ProductVersionService } from './product-version.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductVersionUtilsService } from './product-version.utils.service';
import { ProductVersionFindService } from './product-version.find.service';
import { OffersModule } from 'src/offers/offers.module';
import { CqrsModule } from '@nestjs/cqrs';
import { SearchCardsService } from './domain/services/search-cards.service';
import { SearchPVCardsHandler } from './domain/command/search-cards.handler';

@Module({
  controllers: [ProductVersionController],
  providers: [ProductVersionService, ProductVersionUtilsService, ProductVersionFindService, SearchCardsService, SearchPVCardsHandler],
  imports: [PrismaModule, CacheModule, OffersModule, CqrsModule],
  exports: [ProductVersionFindService, ProductVersionService]
})
export class ProductVersionModule { }
