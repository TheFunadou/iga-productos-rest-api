import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheFactoryService } from './cache.factory';
import { CacheSimpleFind, StaleWhileRevalidateFind, CacheLockingFind, StaleWhileRevalidateWithLockFind } from './cache.strategy';
import { RedisProvider } from '../redis.config';

/**
 * CacheModule.
 * Configures and exports the CacheService, along with all necessary providers:
 * - CacheFactoryService
 * - Strategies (Simple, SWR, Locking)
 * - Redis configuration
 */
@Module({
  providers: [
    CacheService,
    CacheFactoryService,
    CacheSimpleFind,
    StaleWhileRevalidateFind,
    StaleWhileRevalidateWithLockFind,
    CacheLockingFind,
    RedisProvider
  ],
  exports: [CacheService],
})
export class CacheModule { }
