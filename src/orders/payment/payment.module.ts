import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { CacheModule } from 'src/cache/cache.module';
import { BullModule } from '@nestjs/bullmq';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentQueueConsumer } from './payment-queue.consumer';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ShippingModule } from 'src/shipping/shipping.module';

@Module({
  providers: [PaymentService, PaymentProcessorService, PaymentQueueConsumer],
  controllers: [PaymentController],
  imports: [
    CacheModule,
    PrismaModule,
    ShippingModule,
    BullModule.registerQueue({
      name: "payment-processing",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800
        }
      }
    })

  ]
})
export class PaymentModule { }
