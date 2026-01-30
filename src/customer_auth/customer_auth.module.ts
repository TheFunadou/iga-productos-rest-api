import { Module } from '@nestjs/common';
import { CustomerAuthService } from './customer_auth.service';
import { CustomerAuthController } from './customer_auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { CustomerJwtStrategy } from './customer.auth.strategy';
import { PassportModule } from '@nestjs/passport';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  providers: [CustomerAuthService, CustomerJwtStrategy],
  controllers: [CustomerAuthController],
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_CUSTOMER_SECRET,
      signOptions: { expiresIn: '24h' }
    }),
    PrismaModule,
    CacheModule]
})
export class CustomerAuthModule { }
