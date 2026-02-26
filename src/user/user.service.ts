import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDTO, GetUserDashboard, UpdateUserDTO, UserDashboardParams } from './user.dto';
import * as bcrypt from 'bcrypt';
import { CacheService } from 'src/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { Permission, UserModules } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserLogEvent } from 'src/audit/user-log.event';

@Injectable()
export class UserService {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(UserService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly config: ConfigService,
        private readonly eventEmmiter: EventEmitter2
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async create({ data, userUUID }: { data: CreateUserDTO, userUUID: string }): Promise<string> {
        if (data.password !== data.confirm_password) throw new BadRequestException("Las contraseñas no coinciden");
        const hashedPassword = await bcrypt.hash(data.password, 12);
        const user = await this.prisma.user.findMany({ where: { role: "SUPERUSER" } });
        if (user.length === 1 && data.role === "SUPERUSER") throw new BadRequestException("No pueden existir dos superusuarios");
        const { username, uuid } = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: data.name,
                    last_name: data.last_name,
                    username: data.username,
                    email: data.email,
                    role: data.role,
                    image: data.image,
                    accounts: {
                        create: {
                            password: hashedPassword,
                            account_id: data.email,
                            provider_id: "credentials"
                        }
                    }
                },
                select: { id: true, uuid: true, username: true }
            });

            if (
                !data.permissions &&
                data.role !== "ADMIN" &&
                data.role !== "SUPERUSER"
            ) throw new BadRequestException("Se requieren especificar permisos para crear a este usuario");

            if (data.permissions && data.role === "STAFF") {
                await tx.userPermissions.createMany({
                    data: data.permissions.map((permission) => ({
                        module: permission.module,
                        permissions: permission.permissions,
                        user_id: user.id
                    }))
                });
            };
            const { username, uuid } = user;
            return { username, uuid }
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al crear el usuario");
            throw new BadRequestException("Error al crear el usuario");
        });

        await this.cache.invalidateEntity({ entity: "users:dashboard" });
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "USER",
            uuid,
            "Creación de usuario",
            { username },
            userUUID
        ));
        return `Usuario ${username} creado exitosamente`;
    };

    async findUnique(uuid: string) {
        const user = await this.prisma.user.findUnique({ where: { uuid } });
        if (!user) throw new NotFoundException("Usuario no encontrado");
        return user;
    };


    async dashboard({ query: { limit, page, orderby, user } }: { query: UserDashboardParams }): Promise<GetUserDashboard> {
        const skip = (page - 1) * limit;
        const orderBy = orderby || "asc";
        let where = {};
        if (user) where = { OR: [{ username: user }, { email: user }] };
        return await this.cache.remember<GetUserDashboard>({
            method: "staleWhileRevalidateWithLock",
            entity: "users:dashboard",
            query: user ? { limit, page, orderBy, user } : { limit, page, orderBy },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const data = await this.prisma.user.findMany({
                    skip,
                    take: limit,
                    where,
                    select: {
                        uuid: true,
                        name: true,
                        last_name: true,
                        username: true,
                        email: true,
                        image: true,
                        role: true,
                        created_at: true,
                        updated_at: true,
                        permissions: {
                            select: {
                                module: true,
                                permissions: true
                            }
                        }
                    },
                    orderBy: { created_at: orderBy }
                });

                const totalRecords = await this.prisma.user.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);

                const response: GetUserDashboard = {
                    data: data.map((user) => ({
                        ...user,
                        permissions: Object.fromEntries(
                            user.permissions.map(perm => [perm.module, perm.permissions])
                        ) as Partial<Record<UserModules, Permission[]>>
                    })),
                    totalPages,
                    totalRecords
                };

                return response;
            }
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al obtener el dashboard de usuarios");
            throw new BadRequestException("Error al obtener el dashboard de usuarios");
        })
    };


    async remove({ targetUUID, userUUID }: { targetUUID: string, userUUID: string }) {
        const requester = await this.prisma.user.findUnique({ where: { uuid: userUUID }, select: { role: true } });
        if (!requester) throw new NotFoundException("Usuario no encontrado");
        if (requester.role !== "SUPERUSER" && requester.role !== "ADMIN") throw new BadRequestException("Tu rol no cuenta con los permisos para eliminar usuarios");
        const targetUser = await this.prisma.user.findUnique({ where: { uuid: targetUUID }, select: { id: true, role: true } });
        if (!targetUser) throw new NotFoundException("Usuario no encontrado");
        if (targetUser.role === "SUPERUSER") throw new BadRequestException("No se puede eliminar al usuario superuser");
        const deleted = await this.prisma.$transaction(async (tx) => {
            return await tx.user.delete({ where: { id: targetUser.id }, select: { username: true } });
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al eliminar el usuario");
            throw new BadRequestException("Error al eliminar el usuario");
        });
        await this.cache.invalidateEntity({ entity: "users:dashboard" });
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "USER",
            targetUUID,
            "Eliminación de usuario",
            { username: deleted.username },
            userUUID
        ));
        return `Usuario ${deleted.username} eliminado exitosamente`
    };

    async update({ data, userUUID }: { data: UpdateUserDTO, userUUID: string }) {
        const username = await this.prisma.$transaction(async (tx) => {
            const { username, id } = await tx.user.update({
                where: { uuid: data.uuid },
                data: {
                    name: data.name,
                    last_name: data.last_name,
                    email: data.email,
                },
                select: { username: true, id: true }
            });

            if (data.permissions) {
                await tx.userPermissions.deleteMany({
                    where: { user_id: id }
                });

                await tx.userPermissions.createMany({
                    data: data.permissions.map((permission) => ({
                        module: permission.module,
                        permissions: permission.permissions,
                        user_id: id
                    })),
                });

                this.logger.log(`Permisos actualizados para ${username}`)
            };
            return username;
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar el usuario");
            throw new BadRequestException("Error al actualizar el usuario");
        });
        await this.cache.invalidateEntity({ entity: "users:dashboard" });
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "USER",
            data.uuid,
            "Actualización de usuario",
            { username },
            userUUID
        ));
        return `Usuario ${username} actualizado exitosamente`
    };
};
