import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser, AuthUserPermissions, UserCredentialsDTO, UserPayload } from './user_auth.dto';
import * as bcrypt from 'bcrypt';
import { Permission, UserModules } from 'generated/prisma/enums';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/cache/cache.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserAuthService {
    private readonly secret: string;
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly cacheService: CacheService,
        private readonly config: ConfigService,
    ) {
        this.secret = this.config.get<string>("JWT_USER_SECRET") || "";
    };

    async login(dto: UserCredentialsDTO) {
        const authUser = await this.authentication(dto);
        const token = this.jwtService.sign(authUser, { secret: this.secret });
        const csrfToken = randomUUID();
        await this.cacheService.setData({ entity: "user:session:csrf", query: { userUUID: authUser.uuid }, data: { csrfToken }, aditionalOptions: { ttlMilliseconds: 1000 * 60 * 60 } });
        return { access_token: token, payload: authUser, csrfToken };
    };

    private async authentication(dto: UserCredentialsDTO): Promise<UserPayload> {
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
        if (!user) throw new NotFoundException("Correo no registrado");
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

    async getCsrfToken(args: { uuid: string }): Promise<string> {
        const data = await this.cacheService.getData<{ csrfToken: string }>({ entity: "user:session:csrf", query: { userUUID: args.uuid } });
        if (!data) throw new NotFoundException("No se encontro al usuario o no hay token guardado");
        return data.csrfToken;
    };

    async getProfile({ uuid }: { uuid: string }): Promise<AuthUser> {
        const user = await this.prisma.user.findFirst({
            where: { uuid },
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
        if (!user) throw new NotFoundException("Usuario no encontrado");
        const formattedPermissions = Object.fromEntries(
            user.permissions.map(perm => [perm.module, perm.permissions])
        ) as Partial<Record<UserModules, Permission[]>>;

        const payload: UserPayload = {
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            last_name: user.last_name,
            role: user.role,
            permissions: formattedPermissions
        };
        const csrfToken = await this.cacheService.getData<{ csrfToken: string }>({ entity: "user:session:csrf", query: { userUUID: uuid } });
        if (!csrfToken) throw new NotFoundException("No se encontro token csrf asociado a este usuario");
        return { payload, csrfToken: csrfToken.csrfToken };
    };


    async logout(uuid: string) {
        this.cacheService.removeData({
            entity: "user:permissions",
            query: { uuid }
        });
    };
}
