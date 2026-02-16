import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubcategoryDTO, GetSubcategories, PatchSubcategoryDTO } from './subcategories.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserLogEvent } from 'src/audit/user-log.event';

@Injectable()
export class SubcategoriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly eventEmmiter: EventEmitter2
    ) { };

    async create({ data, userUUID }: { data: CreateSubcategoryDTO, userUUID: string }): Promise<string> {
        return await this.prisma.$transaction(async (tx) => {
            const category = await tx.category.findUnique({ where: { uuid: data.category_uuid }, select: { id: true } });
            if (!category) throw new NotFoundException("No se encontro la categoria principal/padre");

            const parentsPath = data.uuid_path.slice(0, -1);
            if (parentsPath.length === 0) {
                const created = await tx.subcategories.create({
                    data: {
                        category_id: category.id,
                        description: data.description,
                        level: 1,
                        father_id: null,
                        father_uuid: null,
                    }
                });
                await this.cache.invalidateQuery({ entity: "subcategories", query: { category: data.category_uuid } });
                return `Subcategoria ${created.description} creada satisfactoriamente`;
            }

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
                    description: data.description,
                    level: data.uuid_path.length,
                    father_id: parents[parents.length - 1].id,
                    father_uuid: parents[parents.length - 1].uuid,
                },
                select: { uuid: true, description: true }
            });
            await this.cache.invalidateQuery({ entity: "subcategories", query: { category: data.category_uuid } });
            this.eventEmmiter.emit("user.log", new UserLogEvent(
                "SUBCATEGORY",
                created.uuid,
                "Creación de subcategoria",
                { description: created.description },
                userUUID
            ));
            return `Subcategoria ${created.description} creada satisfactoriamente`;
        });
    };

    async patch({ data, userUUID }: { data: PatchSubcategoryDTO, userUUID: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const updated = await tx.subcategories.update({
                where: { uuid: data.uuid },
                data: { description: data.description },
                select: {
                    description: true,
                    category: { select: { uuid: true } }
                }
            });
            await this.cache.invalidateQuery({ entity: "subcategories", query: { category: updated.category.uuid } });
            this.eventEmmiter.emit("user.log", new UserLogEvent(
                "SUBCATEGORY",
                data.uuid,
                "Actualización de subcategoria",
                { description: updated.description },
                userUUID
            ));
            return `Subcategoria ${updated.description} actualizada satisfactoriamente`;
        });
    }


    async delete({ subcategoryUUID, userUUID }: { subcategoryUUID: string, userUUID: string }) {
        // Que pasa si elimino una subcategoria que tiene subcategorias hijas?
        const deleted = await this.prisma.subcategories.delete({ where: { uuid: subcategoryUUID }, select: { description: true, category: { select: { uuid: true } } } });
        await this.cache.invalidateQuery({ entity: "subcategories", query: { category: deleted.category.uuid } });
        this.eventEmmiter.emit("user.log", new UserLogEvent(
            "SUBCATEGORY",
            subcategoryUUID,
            "Eliminación de subcategoria",
            { description: deleted.description },
            userUUID
        ));
        return `Subcategoria ${deleted.description} eliminada satisfactoriamente`;
    };


    async findAllByCategoryUUID(args: { categoryUUID: string }): Promise<GetSubcategories[]> {
        return await this.cache.remember<GetSubcategories[]>({
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
