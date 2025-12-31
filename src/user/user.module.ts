import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
    providers: [UserService],
    exports: [UserService],
    imports: [PrismaModule, CacheModule],
    controllers: [UserController],
})
export class UserModule { }
