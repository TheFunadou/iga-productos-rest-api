import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  providers: [ProductService],
  controllers: [ProductController],
  imports: [PrismaModule, CacheModule]
})
export class ProductModule { }
