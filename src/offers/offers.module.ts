import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';
import { OffersUtilsService } from './offers.utils.service';

@Module({
  providers: [OffersService, OffersUtilsService],
  controllers: [OffersController],
  imports: [PrismaModule, CacheModule],
  exports: [OffersUtilsService]
})
export class OffersModule { }
