import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDTO, GetCustomerReviews } from './customer.dto';
import * as bcrypt from 'bcrypt';


@Injectable()
export class CustomerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };


    async register(args: { data: CreateCustomerDTO }) {
        if (args.data.password !== args.data.confirm_password) throw new Error("Las contraseñas no coinciden");
        const hashedPassword = await bcrypt.hash(args.data.password, 12);
        const { password, confirm_password, ...data } = args.data;
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


    async findManyReviews(args: { customerUUID: string }): Promise<GetCustomerReviews[]> {
        return await this.cacheService.remember({
            method: "staleWhileRevalidate",
            entity: "customer:product-version:reviews",
            query: { customerUUID: args.customerUUID },
            fallback: async () => {
                const response = await this.prisma.productReviews.findMany({
                    where: { customer_id: args.customerUUID },
                    select: {
                        title: true,
                        comment: true,
                        rating: true,
                        product_version: {
                            select: {
                                sku: true,
                                color_name: true,
                                color_code: true,
                                color_line: true,
                                product_version_images: {
                                    take: 1,
                                    where: { main_image: true },
                                    select: { image_url: true }
                                },
                                product: {
                                    select: {
                                        product_name: true,
                                        category: { select: { name: true } },
                                        subcategories: { select: { subcategories: { select: { description: true } } } },
                                    }
                                }
                            }
                        }
                    }
                });

                return response.map((reviews) => ({
                    ...reviews,
                    product_version: {
                        sku: reviews.product_version.sku,
                        color_name: reviews.product_version.color_name,
                        color_code: reviews.product_version.color_code,
                        color_line: reviews.product_version.color_line,
                        product_version_images: reviews.product_version.product_version_images,
                        category_name: reviews.product_version.product.category.name,
                        subcategories: reviews.product_version.product.subcategories.map((subcategories) => subcategories.subcategories.description),
                    }
                }))
            }
        });
    };

};
