import { SearchCardsBuildWhereService } from "src/product-version/domain/services/search-cards/build-where.service";
import { BuildCardsContext } from "../../get-cards.context";
import { BuildCardsPipelineStep } from "../../interfaces/pipeline-step.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class BuildWhereStep implements BuildCardsPipelineStep {
    constructor(
        private readonly buildWhere: SearchCardsBuildWhereService,
        private readonly prisma: PrismaService,
    ) { };

    async execute(context: BuildCardsContext): Promise<void> {
        const { queryParams, customerUUID, entityNameSpace, scope, isClient, productsList } = context;

        if (!queryParams && productsList.length) return;

        if (!productsList.length && !queryParams) {
            context.stopPipeline = true;
            return;
        };

        if (!queryParams) throw new BadRequestException("No se proporcionaron filtros");

        const cacheEntity = this.buildWhere.buildCacheEntity({ entity: entityNameSpace });
        const cacheQuery = this.buildWhere.buildCacheQuery({ filters: queryParams, scope });
        const pagination = this.buildWhere.buildPagination({ filters: queryParams, scope });

        const { where, orderBy, totalRecords } = await this.prisma.$transaction(async (tx) => {
            const { where } = await this.buildWhere.buildWhere({ tx, filters: queryParams, verifiedLimit: pagination.take, customerUUID });
            const orderBy = this.buildWhere.buildOrderBy({ filters: queryParams });
            const totalRecords = isClient ? await this.buildWhere.countRecords({ tx, where }) : 0;
            return { where, orderBy, totalRecords };
        });

        if (!totalRecords) {
            context.stopPipeline = true;
            return;
        };
        context.where = where;
        context.cacheEntity = cacheEntity;
        context.cacheQuery = cacheQuery;
        context.orderBy = orderBy;
        context.pagination = pagination;
        context.totalRecords = totalRecords;
        context.totalPages = Math.ceil(totalRecords / pagination.take);
    };
};