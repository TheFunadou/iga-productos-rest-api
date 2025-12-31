import { Module } from '@nestjs/common';
import { CustomerAddressesService } from './customer-addresses.service';
import { CustomerAddressesController } from './customer-addresses.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  providers: [CustomerAddressesService],
  controllers: [CustomerAddressesController],
  imports: [PrismaModule, CacheModule]
})
export class CustomerAddressesModule { }
