import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductVersionModule } from 'src/product-version/product-version.module';
import { OffersModule } from 'src/offers/offers.module';
import { MercadoPagoProvider } from './providers/mercado-pago.provider';
import { CqrsModule } from '@nestjs/cqrs';
import { CancelOrderSaga } from './saga/compensations/cancel-order.saga';
import { ReleaseStockSaga } from './saga/compensations/release-stock.saga';
import { ORDER_PIPELINE_STEPS, ORDER_SAGA_MAP } from './tokens';
import { ValidateCustomerStep } from './applications/pipeline/steps/validate-customer.step';
import { GetShoppingCartStep } from './applications/pipeline/steps/get-shopping-cart.step';
import { GetProductsDataStep } from './applications/pipeline/steps/get-products-data.step';
import { BuildOrderShoppingCartStep } from './applications/pipeline/steps/build-order-shopping-cart';
import { CalcOrderResumeStep } from './applications/pipeline/steps/calc-resume.step';
import { CreatePaymentStep } from './applications/pipeline/steps/create-payment.step';
import { ValidateStockStep } from './applications/pipeline/steps/validate-stock';
import { ReserveStockStep } from './applications/pipeline/steps/reserve-stock.step';
import { CreateOrderStep } from './applications/pipeline/steps/create-order.step';
import { AddItemsStep } from './applications/pipeline/steps/add-items.step';
import { SaveShipmentInfoStep } from './applications/pipeline/steps/save-shipment-info.step';
import { ReserveDiscountStep } from './applications/pipeline/steps/reserve-discount.step';
import { ShoppingCartModule } from 'src/customer/shopping-cart/shopping-cart.module';
import { CreateOrderStrategyFactory } from './domain/factories/create-order-v2.factory';
import { MercadoPagoStrategy } from './domain/strategies/create-order-v2.strategy';
import { CreateOrderHandler } from './applications/handlers/create-order.handler';
import { OrderPipeline } from './applications/pipeline/pipeline';
import { OrderPipelineStepI } from './applications/pipeline/interfaces/pipeline-step.interface';
import { SagaStep } from './applications/pipeline/interfaces/saga-step.interface';
import { ReleaseDiscountSaga } from './saga/compensations/release-discount.saga';

const ORDER_PIPELINE_STEPS_PROVIDERS = [
  ValidateCustomerStep,
  GetShoppingCartStep, // <-- GetShoppingCartStep
  GetProductsDataStep, // <--- Se elimina
  BuildOrderShoppingCartStep,
  ReserveDiscountStep,       // Debe correr justo después del build, dentro del tx
  CalcOrderResumeStep,
  CreatePaymentStep,
  ValidateStockStep,
  ReserveStockStep,
  CreateOrderStep, // <--validate-stock-v2
  AddItemsStep,
  SaveShipmentInfoStep
];

const ORDER_SAGAS_PROVIDERS = [
  CancelOrderSaga,
  ReleaseStockSaga,
  ReleaseDiscountSaga
];



@Module({
  providers: [
    OrdersService,
    CreateOrderStrategyFactory,
    MercadoPagoProvider,
    MercadoPagoStrategy,
    CreateOrderHandler,
    OrderPipeline,
    ...ORDER_PIPELINE_STEPS_PROVIDERS,
    ...ORDER_SAGAS_PROVIDERS,
    {
      provide: ORDER_PIPELINE_STEPS,
      useFactory: (...steps: OrderPipelineStepI[]) => steps,
      inject: ORDER_PIPELINE_STEPS_PROVIDERS
    },
    {
      provide: ORDER_SAGA_MAP,
      useFactory: (
        cancelOrder: CancelOrderSaga,
        releaseStock: ReleaseStockSaga,
        releaseDiscount: ReleaseDiscountSaga
      ) => new Map<Function, SagaStep>([
        [CreateOrderStep, cancelOrder],
        [ReserveStockStep, releaseStock],
        [ReserveDiscountStep, releaseDiscount],
      ]),
      inject: ORDER_SAGAS_PROVIDERS,
    }

  ],
  controllers: [OrdersController],
  imports: [
    CacheModule,
    PrismaModule,
    ProductVersionModule,
    OffersModule,
    CqrsModule,
    ShoppingCartModule
  ],
  exports: [OrdersService, MercadoPagoProvider]
})
export class OrdersModule { }
