import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SearchPVCardsCommand } from "./search-cards.command";
import { SearchCardsService } from "../services/search-cards.service";
import { BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/cache/cache.service";
import { ProductVersionUtilsService } from "src/product-version/product-version.utils.service";
import { GetProductVersionCards } from "src/product-version/product-version.dto";

@CommandHandler(SearchPVCardsCommand)
export class SearchPVCardsHandler implements ICommandHandler<SearchPVCardsCommand> {
    private readonly logger = new Logger(SearchPVCardsHandler.name);
    constructor(
        private readonly searchCardsService: SearchCardsService,
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly utilsService: ProductVersionUtilsService
    ) { };
    async execute(command: SearchPVCardsCommand): Promise<GetProductVersionCards | null> {
        const { filters, customerUUID, entity, scope } = command;
        try {
            const isClient = scope === "external";
            const cacheEntity = this.searchCardsService.buildCacheEntity({ customerUUID, entity });
            const cacheQuery = this.searchCardsService.buildCacheQuery({ filters, customerUUID, scope });
            const pagination = this.searchCardsService.buildPagination({ filters, scope });
            const { where, orderBy, select, totalRecords } = await this.prisma.$transaction(async (tx) => {
                const { where } = await this.searchCardsService.buildWhere({ tx, filters, verifiedLimit: pagination.take, customerUUID });
                const orderBy = this.searchCardsService.buildOrderBy({ filters });
                const select = this.searchCardsService.buildSelect({ customerUUID });
                const totalRecords = isClient ? await this.searchCardsService.countRecords({ tx, where }) : 0;
                return { where, orderBy, select, totalRecords };
            });
            return await this.cache.remember<GetProductVersionCards | null>({
                method: "staleWhileRevalidateWithLock",
                entity: cacheEntity,
                query: cacheQuery,
                fallback: async () => {
                    const data: any = await this.prisma.productVersion.findMany({
                        where,
                        orderBy,
                        select,
                        take: isClient ? pagination.take : undefined,
                        skip: isClient ? pagination.skip : undefined
                    });

                    const discountsMap = await this.searchCardsService.searchDiscounts({ data });
                    const totalPages = isClient ? Math.ceil(totalRecords! / pagination.take) : 1
                    return {
                        data: this.utilsService.formatCards({ data, discountsMap }),
                        totalRecords: totalRecords!,
                        totalPages
                    }
                }
            })

        } catch (error) {
            this.logger.error(error);
            throw new BadRequestException("Ocurrio un problema al obtener las tarjetas de productos");
        }
    };
}