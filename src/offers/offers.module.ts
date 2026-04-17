import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';
import { OffersUtilsService } from './offers.utils.service';
import { AggregateOfferEntitiesService } from './domain/services/aggregate-offer-entities.service';
import { OfferStackResolverService } from './domain/services/offer-stack-resolver.service';

@Module({
  providers: [OffersService, OffersUtilsService, AggregateOfferEntitiesService, OfferStackResolverService],
  controllers: [OffersController],
  imports: [PrismaModule, CacheModule],
  exports: [OffersUtilsService, AggregateOfferEntitiesService, OfferStackResolverService]
})
export class OffersModule { }
