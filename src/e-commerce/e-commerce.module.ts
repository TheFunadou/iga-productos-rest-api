import { Module } from '@nestjs/common';
import { ECommerceService } from './e-commerce.service';
import { ECommerceController } from './e-commerce.controller';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  providers: [ECommerceService],
  controllers: [ECommerceController],
  imports: [CacheModule]
})
export class ECommerceModule { }
