import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { CacheModule } from 'src/cache/cache.module';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ShippingModule } from 'src/shipping/shipping.module';
import { ShoppingCartModule } from 'src/customer/shopping-cart/shopping-cart.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CqrsModule } from '@nestjs/cqrs';

// Nuevas clases
import { MercadoPagoPaymentQueueConsumer } from './domain/queues/mercadopago/payment-queue.consumer';
import { MercadoPagoProcessWebhookHandler } from './domain/commands/mercadopago-proccess-webhook/process-webhook.handler';
import { MercadoPagoProvider } from '../providers/mercado-pago.provider';
import { GetPaymentDetails } from './services/get-payment-details.service';

@Module({
  providers: [
    PaymentService,
    MercadoPagoProcessWebhookHandler,
    MercadoPagoPaymentQueueConsumer,
    MercadoPagoProvider,
    GetPaymentDetails
  ],
  controllers: [PaymentController],
  imports: [
    CqrsModule,
    CacheModule,
    PrismaModule,
    ShippingModule,
    ShoppingCartModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: "mercadopago-payment-processing",
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800 }
      }
    }),
  ]
})
export class PaymentModule { }
