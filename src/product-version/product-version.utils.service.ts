import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_VERSION_CARD_BASE_SELECT, PRODUCT_VERSION_DETAIL_BASE_SELECT } from "./helpers";
import { GetProductVersionCardsRandomOptionsDTO, ProductVersionCard, ProductVersionCardsFiltersDTO, ProductVersionDetail } from "./product-version.dto";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { OffersUtilsService } from "src/offers/offers.utils.service";

@Injectable()
export class ProductVersionUtilsService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly offersUtilsService: OffersUtilsService
    ) { };

    private readonly MAX_CARDS_LIMIT = 20;

    private buildShowDetailsSelect(args: { customerUUID?: string }) {
        if (args.customerUUID) {
            return {
                ...PRODUCT_VERSION_DETAIL_BASE_SELECT,
                customer_favorites: {
                    where: { customer: { uuid: args.customerUUID } },
                    select: { added_at: true }
                }
            };
        };
        return PRODUCT_VERSION_DETAIL_BASE_SELECT;
    };

    buildFindCardsSelect(args: { customerUUID?: string }) {
        if (args.customerUUID) {
            return {
                ...PRODUCT_VERSION_CARD_BASE_SELECT,
                customer_favorites: {
                    where: { customer: { uuid: args.customerUUID } },
                    select: { added_at: true }
                }
            };
        };
        return PRODUCT_VERSION_CARD_BASE_SELECT;
    };

    private buildCardsCacheQuery(args: { filters: ProductVersionCardsFiltersDTO, customerUUID?: string }) {
        if (args.customerUUID) return { filters: args.filters, customer: args.customerUUID };
        return { filters: args.filters };
    };


    private buildPaginationFilter(args: { filters: ProductVersionCardsFiltersDTO, count: number }) {
        const filter: any = {};
        if (!args.filters.limit) return filter;
        filter.take = args.filters.limit;
        if (args.filters.page) filter.skip = (args.filters.page - 1) * args.filters.limit;
        return filter;
    };


    private async buildCardsFilter(args: {
        tx: any,
        filters: ProductVersionCardsFiltersDTO,
        customerUUID?: string
    }) {
        const categoryFilter: any = {};
        const subcategoryFilter: any = {};
        const favoritesFilter: any = {};
        if (args.filters.category) categoryFilter.category = { name: { equals: args.filters.category, mode: "insensitive" } }
        if (args.filters.subcategoryPath?.length) {
            if (!args.filters.category) throw new BadRequestException("Se necesita proveer una categoria principal");
            const subcategoriesPathIds = await args.tx.subcategories.findMany({
                where: { uuid: { in: args.filters.subcategoryPath } }, select: { id: true }
            });
            subcategoryFilter.AND = subcategoriesPathIds.map(sub => ({
                product_subcategories: { some: { subcategory_id: sub.id } }
            }));
        };
        if (args.filters.onlyFavorites && args.customerUUID) {
            const customer = await args.tx.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
            if (!customer) throw new NotFoundException("No se encontro al cliente");
            favoritesFilter.customer_favorites = { some: { customer_id: customer.id } }
        };
        return { where: { product: { ...categoryFilter, ...subcategoryFilter }, ...favoritesFilter } };
    };

    private buildCardsPriceFilter(args: { filters: ProductVersionCardsFiltersDTO }) {
        if (args.filters.moreExpensive) return { orderBy: { unit_price: "desc" as const } };
        return { orderBy: { unit_price: "asc" as const } };
    };

    private async findRandomCardsPublic(args: { options: GetProductVersionCardsRandomOptionsDTO }): Promise<ProductVersionCard[]> {
        if (args.options.limit > this.MAX_CARDS_LIMIT) throw new BadRequestException("El límite de registros supera al máximo permitido");

        return await this.cacheService.remember<ProductVersionCard[]>({
            method: "staleWhileRevalidateWithLock",
            entity: `product-version:cards:${args.options.entity}`,
            query: { random: true },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 13
            },
            fallback: async () => {
                // Query SQL actualizada para incluir IDs necesarios y subcategorías con UUID
                const results: any = await this.prisma.$queryRaw`
                SELECT 
                pv.id,
                p.id as product_id,
                c.id as category_id,
                p.product_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            jsonb_build_object(
                                'uuid', sub.uuid,
                                'description', sub.description
                            )
                        )
                        FROM "ProductSubcategories" ps
                        INNER JOIN "Subcategories" sub ON ps.subcategory_id = sub.id
                        WHERE ps.product_id = p.id
                    ),
                    '[]'::json
                ) as subcategories,
                c.name as category,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'image_url', pi.image_url,
                            'main_image', pi.main_image
                        )
                    ) FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) as product_images,
                jsonb_build_object(
                    'sku', pv.sku,
                    'color_line', pv.color_line,
                    'color_name', pv.color_name,
                    'color_code', pv.color_code,
                    'stock', pv.stock,
                    'unit_price', pv.unit_price::text
                ) as product_version,
                false as "isFavorite"
                FROM "ProductVersion" pv
                INNER JOIN "Product" p ON pv.product_id = p.id
                INNER JOIN "Category" c ON p.category_id = c.id
                LEFT JOIN "ProductVersionImages" pi ON pi.product_version_id = pv.id AND pi.main_image = true
                GROUP BY 
                    pv.id,
                    pv.sku,
                    pv.color_line,
                    pv.color_name,
                    pv.color_code,
                    pv.stock,
                    pv.unit_price,
                    p.id,
                    p.product_name,
                    c.id,
                    c.name
                ORDER BY RANDOM()
                LIMIT ${args.options.limit}
            `;

                // ✅ CORRECTO:
                const productVersionsData = results.map(r => ({
                    versionId: r.id,
                    productId: r.product_id,
                    categoryId: r.category_id,
                    subcategoryIds: r.subcategories.map(s => s.uuid) // ✅ Acceso directo a uuid
                }));

                // Obtener descuentos usando el servicio existente
                const discountsMap = await this.offersUtilsService.checkMultipleProductVersionsDiscounts(productVersionsData);

                // Formatear y agregar descuentos a cada card
                // Formatear y agregar descuentos a cada card
                return results.map(card => ({
                    product_name: card.product_name,
                    subcategories: card.subcategories.map(sub => ({ subcategories: sub })),
                    category: card.category,
                    product_images: card.product_images,
                    product_version: card.product_version,
                    discount: discountsMap.get(card.id)?.discount || 0,
                    isOffer: discountsMap.get(card.id)?.isOffer || false,
                    isFavorite: card.isFavorite
                }));
            }
        });
    }

    private async findRandomCardsBaseAuthCustomer(args: { options: GetProductVersionCardsRandomOptionsDTO, customerUUID: string }): Promise<ProductVersionCard[]> {
        if (args.options.limit > this.MAX_CARDS_LIMIT) throw new BadRequestException("El límite de registros supera al máximo permitido");

        return await this.cacheService.remember({
            method: "staleWhileRevalidateWithLock",
            entity: `"product-version:cards:${args.options.entity}"`,
            query: { random: true },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 13
            },
            fallback: async () => {
                const results: any = await this.prisma.$queryRaw<ProductVersionCard[]>`
                SELECT 
                pv.id,
                p.id as product_id,
                c.id as category_id,
                p.product_name,
               COALESCE(
                    (
                        SELECT json_agg(
                            jsonb_build_object(
                                'uuid', sub.uuid,
                                'description', sub.description
                            )
                        )
                        FROM "ProductSubcategories" ps
                        INNER JOIN "Subcategories" sub ON ps.subcategory_id = sub.id
                        WHERE ps.product_id = p.id
                    ),
                    '[]'::json
                ) as subcategories,
                c.name as category,
                CASE 
                    WHEN COUNT(cf.customer_id) > 0 THEN true 
                    ELSE false 
                END as "isFavorite",
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'image_url', pi.image_url,
                            'main_image', pi.main_image
                        )
                    ) FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) as product_images,
                jsonb_build_object(
                    'sku', pv.sku,
                    'color_line', pv.color_line,
                    'color_name', pv.color_name,
                    'color_code', pv.color_code,
                    'stock', pv.stock,
                    'unit_price', pv.unit_price::text
                ) as product_version
                FROM "ProductVersion" pv
                INNER JOIN "Product" p ON pv.product_id = p.id
                INNER JOIN "Category" c ON p.category_id = c.id
                LEFT JOIN "ProductVersionImages" pi ON pi.product_version_id = pv.id AND pi.main_image = true
                LEFT JOIN "CustomerFavorites" cf ON cf.product_version_id = pv.id
                LEFT JOIN "Customers" cust ON cf.customer_id = cust.id AND cust.uuid = ${args.customerUUID}
                GROUP BY 
                    pv.id,
                    pv.sku,
                    pv.color_line,
                    pv.color_name,
                    pv.color_code,
                    pv.stock,
                    pv.unit_price,
                    p.id,
                    p.product_name,
                    c.id,
                    c.name
                ORDER BY RANDOM()
                LIMIT ${args.options.limit}
            `;

                // ✅ CORRECTO:
                const productVersionsData = results.map(r => ({
                    versionId: r.id,
                    productId: r.product_id,
                    categoryId: r.category_id,
                    subcategoryIds: r.subcategories.map(s => s.uuid) // ✅ Acceso directo a uuid
                }));

                // Obtener descuentos
                const discountsMap = await this.offersUtilsService.checkMultipleProductVersionsDiscounts(productVersionsData);

                // Formatear y agregar descuentos
                return results.map(card => ({
                    product_name: card.product_name,
                    subcategories: card.subcategories.map(sub => ({ subcategories: sub })),
                    category: card.category,
                    product_images: card.product_images,
                    product_version: card.product_version,
                    discount: discountsMap.get(card.id)?.discount || 0,
                    isOffer: discountsMap.get(card.id)?.isOffer || false,
                    isFavorite: card.isFavorite
                }));
            }
        });
    }

    private buildShowDetailsQuery(args: { sku: string, customerUUID?: string }) {
        return args.customerUUID ? { sku: args.sku, customer: args.customerUUID } : { sku: args.sku }
    };

    formatDetail(args: { version: any, discount?: number, isOffer?: boolean }): ProductVersionDetail {

        const formatParentVersions = args.version.product.product_version.map(parents => {
            return {
                sku: parents.sku,
                unit_price: parents.unit_price,
                discount: 0,
                product_images: parents.product_images
            }
        });

        return {
            product: {
                applications: args.version.product.applications,
                certifications_desc: args.version.product.certifications_desc,
                description: args.version.product.description,
                product_name: args.version.product.product_name,
                recommendations: args.version.product.recommendations,
                specs: args.version.product.specs
            },
            subcategories: args.version.product.subcategories,
            product_images: args.version.product_images,
            category: args.version.product.category.name,
            product_version: {
                color_code: args.version.color_code,
                color_line: args.version.color_line,
                color_name: args.version.color_name,
                sku: args.version.sku,
                status: args.version.status,
                stock: args.version.stock,
                technical_sheet_url: args.version.technical_sheet_url,
                unit_price: args.version.unit_price,
            },
            parent_versions: formatParentVersions ?? [],
            discount: args.discount ?? 0,
            isFavorite: (args.version.customer_favorites?.length ?? 0) > 0,
            isOffer: args.isOffer ?? false
        };
    };


    formatCards(args: { data: any[], discountsMap?: Map<string, { discount: number, isOffer: boolean }> }): ProductVersionCard[] {
        const { data } = args;
        const { discountsMap } = args;
        return data.map(cards => {
            const discountInfo = discountsMap?.get(cards.id) || { discount: 0, isOffer: false };

            return {
                product_name: cards.product.product_name,
                subcategories: cards.product.subcategories,
                category: cards.product.category.name,
                product_images: cards.product_version_images,
                product_version: {
                    sku: cards.sku,
                    unit_price: cards.unit_price,
                    color_line: cards.color_line,
                    color_name: cards.color_name,
                    color_code: cards.color_code,
                    stock: cards.stock,
                },
                discount: discountInfo.discount,
                isFavorite: (cards.customer_favorites && cards.customer_favorites.length > 0) ?? false,
                isOffer: discountInfo.isOffer,
            };
        });
    };

    buildShowDetailsFilters(args: { sku: string, customerUUID?: string }) {
        const query = this.buildShowDetailsQuery({ sku: args.sku, customerUUID: args.customerUUID });
        const select = this.buildShowDetailsSelect({ customerUUID: args.customerUUID });
        return { query, select };
    };

    async buildCardsFilters(args: {
        tx: any,
        filters: ProductVersionCardsFiltersDTO,
        customerUUID?: string
    }) {
        if (!args.filters.limit) throw new BadRequestException("Se necesita especificar un límite de registros para realizar esta operación");
        if (args.filters.limit > this.MAX_CARDS_LIMIT) throw new BadRequestException("El límite de registros supera al máximo permitido");
        const cacheQuery = this.buildCardsCacheQuery({ filters: args.filters, customerUUID: args.customerUUID });
        const select = this.buildFindCardsSelect({ customerUUID: args.customerUUID });
        const productVersionFilters = await this.buildCardsFilter({ tx: args.tx, filters: args.filters, customerUUID: args.customerUUID });
        const priceFilters = this.buildCardsPriceFilter({ filters: args.filters });
        const totalRows = await args.tx.productVersion.count();
        if (totalRows < 1) return null;
        const paginationFilter = this.buildPaginationFilter({ filters: args.filters, count: totalRows });

        return {
            cacheQuery,
            select,
            productVersionFilters,
            priceFilters,
            paginationFilter,
            totalRows
        }
    };

    async findRandomCards(options: GetProductVersionCardsRandomOptionsDTO, customerUUID?: string): Promise<ProductVersionCard[]> {
        return customerUUID ? this.findRandomCardsBaseAuthCustomer({ options, customerUUID }) : this.findRandomCardsPublic({ options });
    };

};