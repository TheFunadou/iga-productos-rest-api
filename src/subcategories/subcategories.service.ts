import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubcategoryDTO, GetSubcategories, PatchSubcategoryDTO } from './subcategories.dto';

@Injectable()
export class SubcategoriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };

    async create(args: { data: CreateSubcategoryDTO }): Promise<string> {
        return await this.prisma.$transaction(async (tx) => {
            const category = await tx.category.findUnique({ where: { uuid: args.data.category_uuid }, select: { id: true } });
            if (!category) throw new NotFoundException("No se encontro la categoria principal/padre");
            const parentsPath = args.data.uuid_path.slice(0, -1);
            const parents = await tx.subcategories.findMany({
                where: {
                    category_id: category.id,
                    uuid: { in: parentsPath }
                },
                select: { uuid: true, id: true }
            });
            if (parents.length !== parentsPath.length) throw new BadRequestException("Los parientes de la nueva subcategoria no coinciden con la ruta proporcionada");
            const created = await tx.subcategories.create({
                data: {
                    category_id: category.id,
                    description: args.data.description,
                    level: args.data.uuid_path.length,
                    father_id: parents[parents.length - 1].id,
                    father_uuid: parents[parents.length - 1].uuid,
                }
            });
            await this.cacheService.invalidateQuery({ entity: "subcategories", query: { category: args.data.category_uuid } });
            return `Subcategoria ${created.description} creada satisfactoriamente`;
        });
    };

    async patch(args: { data: PatchSubcategoryDTO }) {
        return await this.prisma.$transaction(async (tx) => {
            const updated = await tx.subcategories.update({
                where: { uuid: args.data.uuid },
                data: { description: args.data.description },
                select: {
                    description: true,
                    category: { select: { uuid: true } }
                }
            });
            await this.cacheService.invalidateQuery({ entity: "subcategories", query: { category: updated.category.uuid } });
            return `Subcategoria ${updated.description} actualizada satisfactoriamente`;
        });
    }


    async delete(args: { uuid: string }) {
        // Que pasa si elimino una subcategoria que tiene subcategorias hijas?
        const deleted = await this.prisma.subcategories.delete({ where: { uuid: args.uuid }, select: { description: true, category: { select: { uuid: true } } } });
        await this.cacheService.invalidateQuery({ entity: "subcategories", query: { category: deleted.category.uuid } });
        return `Subcategoria ${deleted.description} eliminada satisfactoriamente`;
    };


    async findAllByCategoryUUID(args: { categoryUUID: string }): Promise<GetSubcategories[]> {
        return await this.cacheService.remember<GetSubcategories[]>({
            method: "staleWhileRevalidateWithLock",
            entity: "subcategories",
            query: { category: args.categoryUUID },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60 * 24,
                staleTimeMilliseconds: 1000 * 60 * 60 * 23,
            },
            fallback: async () => {
                return await this.prisma.subcategories.findMany({
                    where: { category: { uuid: args.categoryUUID } },
                    select: { uuid: true, description: true, level: true, father_uuid: true },
                    orderBy: [{ level: "asc" }]
                });
            }
        });
    };
};
