import { Module } from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [SubcategoriesService],
  controllers: [SubcategoriesController],
  imports: [CacheModule, PrismaModule]
})
export class SubcategoriesModule { }
