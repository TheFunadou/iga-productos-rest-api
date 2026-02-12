import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDTO, GetDashboardReviews, GetProductReviewResume, GetProductReviews, PatchProductDTO, ProductDetail, SearchedProducts } from './product.dto';
import { ConfigService } from '@nestjs/config';
import { PaginationDTO } from 'src/common/DTO/pagination.dto';
import { CustomerReviewDTO } from 'src/customer/customer.dto';
import { StockDashboardParams } from 'src/product-version/product-version.dto';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);
    private readonly nodeEnv: string;
    constructor(
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.nodeEnv = this.configService.get<string>("NODE_ENV", "DEV");
    };

    async create(args: { userUUID: string, data: CreateProductDTO }) {
        return await this.prisma.$transaction(async (tx) => {
            const { subcategories_path, category_uuid, ...productData } = args.data;
            const user = await tx.user.findUnique({ where: { uuid: args.userUUID }, select: { id: true } });
            if (!user) throw new NotFoundException("Usuario no encontrado");
            const category = await tx.category.findUnique({ where: { uuid: category_uuid }, select: { id: true } });
            if (!category) throw new NotFoundException("Categoria no encontrada");
            const product = await tx.product.create({
                data: { ...productData, user_id: user.id, category_id: category.id }
            }).catch((error) => {
                if (this.nodeEnv === "DEV") this.logger.error(error);
                this.logger.error("Error al crear el producto");
                throw new BadRequestException(`Error al crear el producto`);
            });
            const subcategories = await tx.subcategories.findMany({
                where: { uuid: { in: subcategories_path } }
            });
            await tx.productSubcategories.createMany({
                data: subcategories.map((sub) => ({
                    product_id: product.id,
                    subcategory_id: sub.id
                }))
            });

            return `Producto ${product.product_name} creado exitosamente`;
        });
    };

    async patch(args: { data: PatchProductDTO }) {
        return await this.prisma.$transaction(async (tx) => {
            const { subcategories_path, category_uuid, uuid, ...productData } = args.data;

            const productUpdated = await tx.product.update({
                where: { uuid },
                data: productData,
                select: {
                    id: true,
                    product_name: true,
                    category: { select: { uuid: true } }
                }
            });

            this.logger.log(`Producto ${productUpdated.product_name} actualizado exitosamente`);
            console.log(JSON.stringify(productUpdated, null, 2))

            if (category_uuid && category_uuid !== productUpdated.category.uuid) {
                const category = await tx.category.findUnique({ where: { uuid: args.data.category_uuid }, select: { id: true } });
                if (!category) throw new NotFoundException("Categoria no encontrada");
                await tx.product.update({
                    where: { uuid },
                    data: { category_id: category.id }
                });
            };

            if (subcategories_path && subcategories_path.length > 0) {
                await tx.productSubcategories.deleteMany({
                    where: { product_id: productUpdated.id }
                });

                const subcategories = await tx.subcategories.findMany({
                    where: { uuid: { in: subcategories_path } }
                });

                await tx.productSubcategories.createMany({
                    data: subcategories.map((sub) => ({
                        product_id: productUpdated.id,
                        subcategory_id: sub.id
                    }))
                });
            };

            await this.cacheService.invalidateQuery({ entity: "product:detail", query: { uuid: args.data.uuid } });

            return `Producto ${productUpdated.product_name} actualizado exitosamente`;
        });
    };

    async delete(args: { uuid: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.delete({ where: { uuid: args.uuid } });
            return `Producto ${product.product_name} eliminado exitosamente`;
        });
    };

    async search(args: { query: string }): Promise<SearchedProducts[]> {
        return await this.cacheService.remember<SearchedProducts[]>({
            method: "staleWhileRevalidate",
            entity: "products",
            query: { query: args.query },
            fallback: async () => {
                const response = await this.prisma.product.findMany({
                    take: 10,
                    where: {
                        product_name: {
                            contains: args.query,
                            mode: "insensitive"
                        }
                    },
                    select: {
                        uuid: true,
                        product_name: true,
                        category: { select: { name: true } },
                        subcategories: {
                            select: { subcategories: { select: { description: true } } }
                        },
                        user: { select: { name: true, last_name: true } },
                        created_at: true,
                        updated_at: true
                    }
                });

                return response.map((product) => ({
                    uuid: product.uuid,
                    category: product.category.name,
                    product_name: product.product_name,
                    subcategories: product.subcategories.map((sub) => sub.subcategories.description).join(" - "),
                    user: `${product.user.name} ${product.user.last_name}`,
                    created_at: product.created_at,
                    updated_at: product.updated_at
                }));
            }
        });
    };

    async showDetailsByUUID(args: { uuid: string }): Promise<ProductDetail | null> {
        return await this.cacheService.remember<ProductDetail | null>({
            method: "staleWhileRevalidate",
            entity: "product:detail",
            query: { uuid: args.uuid },
            aditionalOptions: {
                staleTimeMilliseconds: 1000 * 60 * 10,
                ttlMilliseconds: 1000 * 60 * 15
            },
            fallback: async () => {
                const result = await this.prisma.product.findUnique({
                    where: { uuid: args.uuid },
                    select: {
                        uuid: true,
                        product_name: true,
                        description: true,
                        specs: true,
                        recommendations: true,
                        applications: true,
                        certifications_desc: true,
                        created_at: true,
                        updated_at: true,
                        category: { select: { uuid: true, name: true } },
                        subcategories: { select: { subcategories: { select: { uuid: true, description: true, } } } },
                        user: { select: { name: true, last_name: true } },
                        product_versions: {
                            select: {
                                product_version_images: { select: { main_image: true, image_url: true } },
                                color_name: true,
                                color_code: true,
                                color_line: true,
                                code_bar: true,
                                sku: true,
                                stock: true,
                                status: true,
                                unit_price: true,
                                technical_sheet_url: true,
                                created_at: true,
                                updated_at: true
                            },
                            orderBy: { sku: "asc" }
                        }
                    }
                });

                if (!result) return null;

                return {
                    product: {
                        uuid: result.uuid,
                        product_name: result.product_name,
                        description: result.description,
                        specs: result.specs,
                        recommendations: result.recommendations,
                        applications: result.applications,
                        certifications_desc: result.certifications_desc,
                        created_at: result.created_at,
                        updated_at: result.updated_at,
                    },
                    category: result.category.name,
                    category_uuid: result.category.uuid,
                    subcategories: result.subcategories.map(sub => ({
                        uuid: sub.subcategories.uuid,
                        description: sub.subcategories.description
                    })),
                    created_by: `${result.user.name} ${result.user.last_name}`,
                    versions: result.product_versions.map(ver => ({
                        ...ver,
                        version_images: ver.product_version_images,
                        main_version: true
                    }))
                }
            }
        });
    };

    //Cambiar de agregar al hijo a agregarlas al padre
    async addReview(args: { customerUUID: string, data: CustomerReviewDTO }): Promise<string> {
        if (args.data.rating > 5) throw new BadRequestException("El rating no puede ser mayor a 5");
        const customer = await this.prisma.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
        const productVersion = await this.prisma.productVersion.findFirst({ where: { sku: { equals: args.data.sku, mode: "insensitive" } }, select: { id: true, product: { select: { id: true } } } });
        if (!customer) throw new NotFoundException("No se encontro el cliente");
        if (!productVersion) throw new NotFoundException("No se encontro la version de producto");

        const review = await this.prisma.productReviews.findFirst({ where: { customer_id: customer.id, product_version_id: productVersion.id }, select: { uuid: true } });
        if (review) throw new BadRequestException("Ya has agregado un comentario para esta version de producto");
        return await this.prisma.$transaction(async (tx) => {
            await tx.productReviews.create({
                data: {
                    title: args.data.title,
                    comment: args.data.comment,
                    rating: args.data.rating,
                    customer_id: customer.id,
                    product_id: productVersion.product.id,
                    product_version_id: productVersion.id
                }
            }).catch((error) => {
                if (this.nodeEnv === "DEV") this.logger.error(error);
                this.logger.error("Ocurrio un error al agregar una reseña");
                throw new BadRequestException("Ocurrio un error inesperado al agregar la reseña");
            });
            await this.cacheService.invalidateEntity({ entity: `product-version:show:details:${args.customerUUID}` })
            return `Tu reseña ha sido enviada`;
        });
    };

    async findManyReviewsByUUID({ productUUID, pagination: { limit, page } }: { productUUID: string, pagination: PaginationDTO }) {
        return await this.cacheService.remember<GetProductReviews>({
            method: "staleWhileRevalidateWithLock",
            entity: "product:reviews",
            query: { productUUID },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60,
                staleTimeMilliseconds: 1000 * 60 * 50
            },
            fallback: async () => {
                return await this.prisma.$transaction(async (tx) => {
                    const result = await tx.productReviews.findMany({
                        take: limit || 10,
                        skip: (page || 1) - 1,
                        where: { product_version: { product: { uuid: productUUID } } },
                        select: {
                            uuid: true,
                            title: true,
                            comment: true,
                            rating: true,
                            created_at: true,
                            customer: { select: { name: true } }
                        },
                    });

                    const totalRecords = await tx.productReviews.count({
                        where: { product_version: { product: { uuid: productUUID } } },
                    });

                    const reviews = result.map((review) => ({ ...review, customer: review.customer.name }));

                    const response: GetProductReviews = {
                        reviews,
                        totalRecords,
                        totalPages: Math.ceil(totalRecords / (limit || 10))
                    };
                    return response;
                })
            }
        })
    };

    async getReviewRatingResumeByUUID({ productUUID }: { productUUID: string }): Promise<GetProductReviewResume> {
        return await this.cacheService.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:reviews:rating-review-resume",
            query: { productUUID },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60,
                staleTimeMilliseconds: 1000 * 60 * 50
            },
            fallback: async () => {
                const ratingPerStar = await this.prisma.productReviews.groupBy({
                    by: ['rating'],
                    where: { product_version: { product: { uuid: productUUID } } },
                    _count: { rating: true }
                });

                const totalRecords = ratingPerStar.reduce((acc, r) => acc + r._count.rating, 0);
                const totalStarts = ratingPerStar.reduce((acc, r) => acc + (r.rating * r._count.rating), 0);

                const ratingResume = Array.from({ length: 5 }, (_, i) => {
                    const star = i + 1
                    const found = ratingPerStar.find(r => r.rating === star)
                    const count = found?._count.rating ?? 0

                    return {
                        rating: star,
                        percentage: totalRecords === 0 ? 0 : Math.round((count / totalRecords) * 100)
                    }
                });

                const ratingAverage = totalRecords === 0 ? 0 : Math.round(((totalStarts / totalRecords) * 100) / 5);
                return {
                    ratingResume: ratingResume.reverse(),
                    ratingAverage,
                    totalReviews: totalRecords
                }
            }
        })
    };

    async getReviewsDashboard({ params: { orderBy, limit, page, type, value } }: { params: StockDashboardParams }): Promise<GetDashboardReviews> {
        if (!limit || !page) throw new BadRequestException("Los parametros de paginacion son requeridos");
        return await this.cacheService.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "product:reviews:dashboard",
            query: { params: { orderBy, limit, page, type, value } },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 60,
                staleTimeMilliseconds: 1000 * 60 * 50
            },
            fallback: async () => {
                let where = {};
                if (type && type === "product") {
                    if (!value) throw new BadRequestException("El parametro value no esta incluido en la petición");
                    where = {
                        product: { uuid: value }
                    }
                };
                if (type && type === "version") {
                    if (!value) throw new BadRequestException("El parametro value no esta incluido en la petición");
                    where = { product_version: { sku: value.toUpperCase() } }
                };

                const data = await this.prisma.productReviews.findMany({
                    take: limit,
                    skip: (page || 1) - 1,
                    where,
                    select: {
                        uuid: true,
                        customer: { select: { name: true, last_name: true } },
                        title: true,
                        comment: true,
                        rating: true,
                        created_at: true,
                        product_version: {
                            select: {
                                sku: true,
                                product: {
                                    select: { product_name: true }
                                },
                                product_version_images: {
                                    where: { main_image: true },
                                    take: 1,
                                    select: { image_url: true }
                                }
                            }
                        }
                    },
                    orderBy: { created_at: orderBy || "desc" }
                }).catch((error) => {
                    if (this.nodeEnv === "DEV") this.logger.error(error);
                    this.logger.error(`Ocurrio un error inesperado al obtener el stock del producto`);
                    throw new BadRequestException(`Ocurrio un error inesperado al obtener el stock del producto`, this.nodeEnv === "DEV" && error);
                });
                ;
                const totalRecords = await this.prisma.productReviews.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                const response: GetDashboardReviews = {
                    data: data.map((review) => ({
                        ...review,
                        uuid: review.uuid,
                        customer: `${review.customer.name} ${review.customer.last_name}`,
                        sku: review.product_version.sku,
                        product_name: review.product_version.product.product_name,
                        image_url: review.product_version.product_version_images[0].image_url
                    })),
                    totalRecords,
                    totalPages
                };
                return response;
            }
        })
    };

    async deleteReview({ uuid, sku }: { uuid: string, sku: string }): Promise<string> {
        await this.prisma.productReviews.delete({ where: { uuid, product_version: { sku } } });
        await this.cacheService.invalidateEntity({ entity: "product:reviews:dashboard" });
        return "Reseña del producto eliminada correctamente";
    };




};
