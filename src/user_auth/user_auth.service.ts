import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUserPermissions, UserCredentialsDTO, UserPayload, UserPermissions } from './user_auth.dto';
import * as bcrypt from 'bcrypt';
import { Permission, UserModules } from 'generated/prisma/enums';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class UserAuthService {
    private readonly secret = process.env.JWT_USER_SECRET;
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly cacheService: CacheService
    ) { };

    async login(dto: UserCredentialsDTO) {
        const authUser = await this.authentication(dto);
        const token = this.jwtService.sign(authUser, { secret: this.secret });
        return { access_token: token, payload: authUser, csrfToken: randomUUID() };
    };

    private async authentication(dto: UserCredentialsDTO) {
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ email: dto.email_or_username }, { username: dto.email_or_username }] },
            select: {
                uuid: true,
                email: true,
                name: true,
                last_name: true,
                role: true,
                accounts: { select: { password: true, } },
                permissions: { select: { module: true, permissions: true } }
            }
        });

        if (!user) throw new NotFoundException("No se encontro al usuario");
        const passwordMatch = await bcrypt.compare(dto.password, user.accounts[0].password);
        if (!passwordMatch) throw new BadRequestException("Contraseña incorrecta");

        const formattedPermissions = Object.fromEntries(
            user.permissions.map(perm => [perm.module, perm.permissions])
        ) as Partial<Record<UserModules, Permission[]>>;


        await this.cacheService.setData<AuthUserPermissions>({
            entity: "user:permissions",
            query: { uuid: user.uuid },
            data: { role: user.role, permissions: formattedPermissions },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60 * 24,
                enabledJitter: true
            }
        });

        const payload: UserPayload = {
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            last_name: user.last_name,
            role: user.role,
            permissions: formattedPermissions
        };
        return payload;
    };

    async logout(uuid: string) {
        this.cacheService.removeData({
            entity: "user:permissions",
            query: { uuid }
        });
    };
}
