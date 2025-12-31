import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [CategoriesService],
  controllers: [CategoriesController],
  imports: [CacheModule, PrismaModule]
})
export class CategoriesModule { }
