import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { OrdersModule } from '../orders.module';

@Module({
  providers: [PaymentService],
  controllers: [PaymentController],
  imports: [OrdersModule]
})
export class PaymentModule { }
