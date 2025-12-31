import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { CustomerCredentialsDTO, CustomerPayload } from './customer_auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerAuthService {
    private readonly secret = process.env.JWT_CUSTOMER_SECRET;
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { };

    async login(dto: CustomerCredentialsDTO) {
        const authUser = await this.authentication(dto);
        const token = this.jwtService.sign(authUser, { secret: this.secret });
        return { access_token: token, payload: authUser, csrfToken: randomUUID() };
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

        if (!user) throw new NotFoundException("No se encontro al usuario");
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

};
