import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthCustomer, CustomerCredentialsDTO, CustomerPayload } from './customer_auth.dto';
import * as bcrypt from 'bcrypt';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class CustomerAuthService {
    private readonly secret = process.env.JWT_CUSTOMER_SECRET;
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly cacheService: CacheService
    ) { };

    async login(dto: CustomerCredentialsDTO) {
        const authUser = await this.authentication(dto);
        const token = this.jwtService.sign(authUser, { secret: this.secret });
        const csrfToken = randomUUID();
        await this.cacheService.setData({ entity: "customer:session:csrf", query: { customerUUID: authUser.uuid }, data: { csrfToken }, aditionalOptions: { ttlMilliseconds: 1000 * 60 * 60 * 24 } });
        return { access_token: token, payload: authUser, csrfToken };
    };

    private async authentication(dto: CustomerCredentialsDTO) {
        const user = await this.prisma.customer.findFirst({
            where: { email: dto.email },
            select: {
                uuid: true,
                email: true,
                name: true,
                last_name: true,
                accounts: { select: { password: true, } },
            }
        });

        if (!user) throw new NotFoundException("Correo no registrado");
        const passwordMatch = await bcrypt.compare(dto.password, user.accounts[0].password);
        if (!passwordMatch) throw new BadRequestException("Contraseña incorrecta");

        const payload: CustomerPayload = {
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            last_name: user.last_name,
        };
        return payload;
    };

    async getCsrfToken(args: { uuid: string }): Promise<string> {
        const data = await this.cacheService.getData<{ csrfToken: string }>({ entity: "customer:session:csrf", query: { customerUUID: args.uuid } });
        if (!data) throw new NotFoundException("No se encontro al usuario o no hay token guardado");
        return data.csrfToken;
    };

    async getProfile(args: { uuid: string }): Promise<AuthCustomer> {
        const customer = await this.prisma.customer.findUnique({
            where: { uuid: args.uuid },
            select: {
                uuid: true,
                email: true,
                name: true,
                last_name: true,
            }
        });
        if (!customer) throw new NotFoundException("Cliente no encontrado");
        const csrfToken = await this.cacheService.getData<{ csrfToken: string }>({ entity: "customer:session:csrf", query: { customerUUID: args.uuid } });
        if (!csrfToken) throw new NotFoundException("No se encontro token csrf asociado a este cliente");
        return { payload: customer, csrfToken: csrfToken.csrfToken };
    };

};
