import { Injectable } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService
  ) { };

}
