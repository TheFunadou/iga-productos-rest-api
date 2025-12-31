import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDTO } from './customer.dto';
import * as bcrypt from 'bcrypt';


@Injectable()
export class CustomerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };


    async register(args: { data: CreateCustomerDTO }) {
        const hashedPassword = await bcrypt.hash(args.data.password, 12);
        const { password, ...data } = args.data;
        await this.prisma.customer.create({
            data: {
                ...data,
                accounts: {
                    create: {
                        password: hashedPassword,
                        account_id: data.email,
                        provider_id: "credentials"
                    }
                }
            }
        });
        return `Registro completado exitosamente`
    };

    async findAll(args: { page: number, limit: number }) {
        return await this.cacheService.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "customer:all",
            query: { page: args.page, limit: args.limit },
            fallback: async () => {
                return await this.prisma.customer.findMany({
                    take: args.limit,
                    skip: (args.page - 1) * args.limit,
                    orderBy: { id: "desc" },
                    omit: { id: true }
                });
            }
        })
    };

    async findUnique(args: { uuid: string }) {
        return await this.cacheService.remember({
            method: "staleWhileRevalidate",
            entity: "customer",
            query: { customer: args.uuid },
            fallback: async () => {
                return await this.prisma.customer.findUnique({ where: { uuid: args.uuid }, omit: { id: true } });
            }
        })
    };





};
