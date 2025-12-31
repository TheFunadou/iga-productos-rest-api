import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDTO } from './user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {

    constructor(
        private readonly prisma: PrismaService,
    ) { };

    async createUser(args: { data: CreateUserDTO }) {
        const hashedPassword = await bcrypt.hash(args.data.password, 12);

        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: args.data.name,
                    last_name: args.data.last_name,
                    username: args.data.username,
                    email: args.data.email,
                    role: args.data.role,
                    image: args.data.image,
                    accounts: {
                        create: {
                            password: hashedPassword,
                            account_id: args.data.email,
                            provider_id: "credentials"
                        }
                    }
                }
            });

            if (
                !args.data.permissions &&
                args.data.role !== "ADMIN" &&
                args.data.role !== "SUPERUSER"
            ) throw new BadRequestException("Se requieren especificar permisos para crear a este usuario");
            if (args.data.permissions && args.data.role === "STAFF") {
                await tx.userPermissions.createMany({
                    data: args.data.permissions.map((permission) => ({
                        module: permission.module,
                        permissions: permission.permissions,
                        user_id: user.id
                    }))
                });
            };

            const { id, ...safeUser } = user;
            return safeUser

        })
    };

    async findUnique(uuid: string) {
        const user = await this.prisma.user.findUnique({ where: { uuid } });
        if (!user) throw new NotFoundException("Usuario no encontrado");
        return user;
    }


};
