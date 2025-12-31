import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDTO, PatchProductDTO, ProductDetail, SearchedProducts } from './product.dto';

@Injectable()
export class ProductService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly prisma: PrismaService,
    ) { };

    async create(args: { userUUID: string, data: CreateProductDTO }) {
        return await this.prisma.$transaction(async (tx) => {
            const { subcategories_path, ...productData } = args.data;
            const user = await tx.user.findUnique({ where: { uuid: args.userUUID }, select: { id: true } });
            if (!user) throw new NotFoundException("Usuario no encontrado");
            const category = await tx.category.findUnique({ where: { uuid: args.data.category_uuid }, select: { id: true } });
            if (!category) throw new NotFoundException("Categoria no encontrada");
            const product = await tx.product.create({
                data: { ...productData, user_id: user.id, category_id: category.id }
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
            const { subcategories_path, category_uuid, ...productData } = args.data;

            const productUpdated = await tx.product.update({
                where: { uuid: args.data.uuid },
                data: productData,
                select: {
                    id: true,
                    product_name: true,
                    category: { select: { uuid: true } }
                }
            });

            if (category_uuid && category_uuid !== productUpdated.category.uuid) {
                const category = await tx.category.findUnique({ where: { uuid: args.data.category_uuid }, select: { id: true } });
                if (!category) throw new NotFoundException("Categoria no encontrada");
                await tx.product.update({
                    where: { uuid: args.data.uuid },
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
                            }
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

    async detail(sku: string) {

    };

};
