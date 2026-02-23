import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';
import { CustomerAddressesModule } from './customer-addresses/customer-addresses.module';
import { ShoppingCartModule } from './shopping-cart/shopping-cart.module';
import { FavoritesModule } from './favorites/favorites.module';
import { CustomerAuthModule } from 'src/customer_auth/customer_auth.module';

@Module({
  providers: [CustomerService],
  controllers: [CustomerController],
  imports: [PrismaModule, CacheModule, CustomerAddressesModule, ShoppingCartModule, FavoritesModule, CustomerAuthModule]
})
export class CustomerModule { }
