import { Module } from '@nestjs/common';
import { ECommerceService } from './e-commerce.service';
import { ECommerceController } from './e-commerce.controller';

@Module({
  providers: [ECommerceService],
  controllers: [ECommerceController]
})
export class ECommerceModule {}
