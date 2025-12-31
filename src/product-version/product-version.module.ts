import { Module } from '@nestjs/common';
import { ProductVersionController } from './product-version.controller';
import { ProductVersionService } from './product-version.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductVersionUtilsService } from './product-version.utils.service';
import { ProductVersionFindService } from './product-version.find.service';

@Module({
  controllers: [ProductVersionController],
  providers: [ProductVersionService, ProductVersionUtilsService, ProductVersionFindService],
  imports: [PrismaModule, CacheModule],
  exports: [ProductVersionFindService, ProductVersionService]
})
export class ProductVersionModule { }
