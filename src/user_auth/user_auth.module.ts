import { Module } from '@nestjs/common';
import { UserAuthService } from './user_auth.service';
import { UserAuthController } from './user_auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { UserJwtStrategy } from './user_auth.strategy';
import { PassportModule } from '@nestjs/passport';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  providers: [UserAuthService, UserJwtStrategy],
  controllers: [UserAuthController],
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_USER_SECRET,
      signOptions: { expiresIn: '24h' }
    }),
    PrismaModule,
    CacheModule
  ]

})
export class UserAuthModule { }
