import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { GetUserLogsDashboard } from "./audit.dto";
import { UserDashboardParams } from "src/user/user.dto";

@Injectable()
export class AuditService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService
    ) { };


    async dashboard({ query: { limit, page, orderby, user } }: { query: UserDashboardParams }): Promise<GetUserLogsDashboard> {
        const skip = (page - 1) * limit;
        const orderBy = orderby || "asc";
        let where = {};
        if (user) where = { user: { OR: [{ uuid: user }, { username: { equals: user, mode: "insensitive" } }] } };

        return await this.cache.remember<GetUserLogsDashboard>({
            method: "staleWhileRevalidateWithLock",
            entity: "user:logs",
            query: user ? { limit, page, orderby, user } : { limit, page, orderby },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const data = await this.prisma.userLogs.findMany({
                    take: limit,
                    skip,
                    where,
                    orderBy: { created_at: orderBy },
                    omit: {
                        id: true,
                        user_id: true,
                        entity_id: true,
                    },
                    include: {
                        user: { select: { uuid: true, username: true } }
                    }
                });

                const totalRecords = await this.prisma.userLogs.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                const response: GetUserLogsDashboard = {
                    data: data.map((logs) => ({
                        ...logs,
                        user_uuid: logs.user?.uuid,
                        username: logs.user?.username,
                    })),
                    totalRecords,
                    totalPages,
                };
                return response;
            }
        })

    };

};

