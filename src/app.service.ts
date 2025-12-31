import { Injectable } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService
  ) { };

  async example() {
    return await this.cacheService.remember({
      method: "staleWhileRevalidateWithLock",
      entity: "test",
      query: { all: true },
      fallback: async () => {
        return await this.prisma.productVersion.findMany({
          take: 10
        })
      }
    })
  };

  async example2() {
    await this.cacheService.invalidateEntity({ entity: "test" })
  }
}
