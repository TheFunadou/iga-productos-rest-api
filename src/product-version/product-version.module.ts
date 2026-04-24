import { Module } from '@nestjs/common';
import { ProductVersionController } from './product-version.controller';
import { ProductVersionService } from './product-version.service';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OffersModule } from 'src/offers/offers.module';
import { CqrsModule } from '@nestjs/cqrs';
import { SearchCardsBuildWhereService } from './domain/services/search-cards/build-where.service';
import { FavoritesModule } from 'src/customer/favorites/favorites.module';

// Pipeline v2 — Build Cards
import { BuildCardsPipeline } from './application/pipelines/get-cards.pipeline';
import { DebugBuildCardsPipeline } from './application/pipelines/get-cards-debug-pipeline';
import { PipelineDebugEngine } from './application/pipelines/get-cards-pipeline-debug.engine';
import { BUILD_CARDS_PIPELINE_STEPS, GET_DETAILS_PIPELINE_STEPS } from './application/pipelines/tokens';
import { BuildCardsPipelineStep } from './application/pipelines/interfaces/pipeline-step.interface';
import { BuildWhereStep } from './application/pipelines/steps/get-cards/build-where.step';
import { FetchProductsStep } from './application/pipelines/steps/get-cards/fetch-products.step';
import { AggregateDataStep } from './application/pipelines/steps/get-cards/aggregate-data.step';
import { BuildCardsStep } from './application/pipelines/steps/get-cards/build-cards.step';
import { AggregateCardEntitiesService } from './domain/services/search-cards/aggregate-entities.service';
import { GetCardsHandler } from './application/handlers/get-cards.handler';
import { BuildDetailsStep } from './application/pipelines/steps/get-details/build-details.step';
import { FetchCachedDataStep } from './application/pipelines/steps/get-details/fetch-cached-data.step';
import { HydrateDetailsStep } from './application/pipelines/steps/get-details/hydrate-details.step';
import { BuildDetailsPipeline } from './application/pipelines/get-details.pipeline';
import { GetDetailsHandler } from './application/handlers/get-details.handler';
import { AggregateDetailsEntitiesService } from './domain/services/search-details/aggregate-entities.service';

const BUILD_CARDS_STEPS_PROVIDERS = [
  BuildWhereStep,
  FetchProductsStep,
  AggregateDataStep,
  BuildCardsStep,
];

// Añadir a los providers del modulo
const GET_DETAILS_STEPS_PROVIDERS = [
  FetchCachedDataStep,
  HydrateDetailsStep,
  BuildDetailsStep,
];



@Module({
  controllers: [ProductVersionController],
  providers: [
    // Servicios existentes
    ProductVersionService,
    SearchCardsBuildWhereService,
    AggregateCardEntitiesService,
    AggregateDetailsEntitiesService,

    // Pipeline v2
    ...BUILD_CARDS_STEPS_PROVIDERS,
    {
      provide: BUILD_CARDS_PIPELINE_STEPS,
      useFactory: (...steps: BuildCardsPipelineStep[]) => steps,
      inject: BUILD_CARDS_STEPS_PROVIDERS,
    },
    BuildCardsPipeline,
    DebugBuildCardsPipeline,
    PipelineDebugEngine,
    {
      provide: "BUILD_CARDS_PIPELINE_RESOLVED",
      useFactory: (debug: DebugBuildCardsPipeline, normal: BuildCardsPipeline) => {
        return process.env.NODE_ENV === "DEV" ? debug : normal;
      },
      inject: [DebugBuildCardsPipeline, BuildCardsPipeline]
    },
    ...GET_DETAILS_STEPS_PROVIDERS,
    {
      provide: GET_DETAILS_PIPELINE_STEPS,
      useFactory: (...steps) => steps,
      inject: GET_DETAILS_STEPS_PROVIDERS,
    },
    BuildDetailsPipeline,
    GetDetailsHandler,
    GetCardsHandler,
  ],


  imports: [PrismaModule, CacheModule, OffersModule, CqrsModule, FavoritesModule],
  exports: [ProductVersionService, AggregateCardEntitiesService]
})
export class ProductVersionModule { }
