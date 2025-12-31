import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheFactoryService } from './cache.factory';
import { CacheSimpleFind, StaleWhileRevalidateFind, CacheLockingFind, StaleWhileRevalidateWithLockFind } from './cache.strategy';
import { RedisProvider } from '../redis.config';
import Keyv from 'keyv';
import { createKeyvInstance } from './keyv.config';

export const KEYV_CACHE = "KEYV_CACHE"

/**
 * CacheModule.
 * Configures and exports the CacheService, along with all necessary providers:
 * - CacheFactoryService
 * - Strategies (Simple, SWR, Locking)
 * - Redis/Keyv configuration
 */
@Module({
  providers: [
    CacheService,
    CacheFactoryService,
    CacheSimpleFind,
    StaleWhileRevalidateFind,
    StaleWhileRevalidateWithLockFind,
    CacheLockingFind,
    RedisProvider,
    {
      provide: KEYV_CACHE,
      useFactory: async (): Promise<Keyv> => { return createKeyvInstance(); }
    }
  ],
  exports: [CacheService],
})
export class CacheModule { }
