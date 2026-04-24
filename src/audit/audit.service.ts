import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { DashboardCommonQueryDTO } from "src/common/DTO/common.dto";
import { Prisma } from "@prisma/client";
import { UserLogsDashboard } from "./application/interfaces/audit.interface";
import { handleLimit } from "src/common/helpers/helpers";

@Injectable()
export class AuditService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { };


    async dashboard({ query }: { query: DashboardCommonQueryDTO }): Promise<UserLogsDashboard> {
        const page = query.page ?? 1;
        const limit = handleLimit(query.limit);
        const orderBy = query.orderBy ?? "asc";
        const user = query.target;

        const skip = (page - 1) * limit;
        let where: Prisma.UserLogsWhereInput = {};
        if (user) where = { user: { OR: [{ uuid: user }, { username: { equals: user, mode: "insensitive" } }] } };

        return await this.cache.remember<UserLogsDashboard>({
            method: "staleWhileRevalidateWithLock",
            entity: "user:logs",
            query: user ? { limit, page, orderBy, user } : { limit, page, orderBy },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const data = await this.prisma.userLogs.findMany({
                    take: limit,
                    skip,
                    where,
                    orderBy: { createdAt: orderBy },
                    omit: { id: true, userId: true, entityId: true, },
                    include: {
                        user: { select: { uuid: true, username: true, name: true, last_name: true } }
                    }
                });
                const totalRecords = await this.prisma.userLogs.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                return {
                    data: data.map((logs) => ({
                        user: { name: logs.user?.name, surname: logs.user?.last_name, username: logs.user?.username },
                        entity: logs.entity,
                        action: logs.action,
                        metadata: logs.metadata,
                    })),
                    totalRecords,
                    totalPages,
                    currentPage: page
                } satisfies UserLogsDashboard;
            }
        })

    };

};

