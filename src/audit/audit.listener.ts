import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UserLogEvent } from "./user-log.event";
import { OnEvent } from "@nestjs/event-emitter";

@Injectable()
export class AuditListener {
    constructor(private prisma: PrismaService) { }

    @OnEvent('user.log', { async: true })
    async handleUserLog(event: UserLogEvent) {
        const { userId } = event;
        if (!userId) throw new BadRequestException("Usuario no encontrado");

        const user = await this.prisma.user.findUnique({ where: { uuid: userId }, select: { id: true } });

        if (!user) throw new NotFoundException("Usuario no encontrado");

        await this.prisma.userLogs.create({
            data: {
                entity: event.entity,
                entityId: event.entityId,
                action: event.action,
                metadata: event.metadata || {},
                userId: user.id
            }
        });
    }
}