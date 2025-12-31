import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDTO, GetCategories, PatchCategoryDTO } from './categories.dto';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
    ) { };

    async create(args: { data: CreateCategoryDTO }): Promise<GetCategories> {
        return await this.prisma.category.create({ data: args.data, omit: { id: true } });
    };

    async findAll(): Promise<GetCategories[]> {
        return await this.cacheService.remember<GetCategories[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "categories",
            query: { all: true },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60,
                staleTimeMilliseconds: 1000 * 60 * 50
            },
            fallback: async () => {
                return await this.prisma.category.findMany({ omit: { id: true } });
            }
        });
    };

    async patch(args: { data: PatchCategoryDTO }): Promise<GetCategories> {
        return await this.prisma.category.update({
            where: { uuid: args.data.uuid },
            data: args.data
        });
    };

    async delete(args: { uuid: string }): Promise<string> {
        const deleted = await this.prisma.category.delete({ where: { uuid: args.uuid } });
        await this.cacheService.invalidateQuery({ entity: "categories", query: { all: true } });
        return `Categoria eliminada sastisfactoriamente ${deleted.name}`
    };
};
