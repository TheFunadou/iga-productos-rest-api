import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDTO, GetCustomerReviews, UpdateCustomerDTO } from './customer.dto';
import * as bcrypt from 'bcrypt';
import { CustomerAuthService } from 'src/customer_auth/customer_auth.service';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);
    private readonly nodeEnv: string;
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly auth: CustomerAuthService,
        private readonly config: ConfigService
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async register(args: { data: CreateCustomerDTO }) {
        const validation = await this.auth.validateToken({
            email: args.data.email,
            sessionId: args.data.session_id,
            token: args.data.token,
            type: "verification"
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al validar el token");
            throw new BadRequestException("Ocurrio un error inesperado al validar el token");
        });
        if (!validation) throw new BadRequestException("Verificación invalida, ingrese nuevamente el código de verificación");
        if (args.data.password !== args.data.confirm_password) throw new Error("Las contraseñas no coinciden");
        const hashedPassword = await bcrypt.hash(args.data.password, 12);
        const { password, confirm_password, token, session_id, ...data } = args.data;
        await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: { ...data, email_verified: validation },
                select: { id: true }
            });

            await tx.customerAccount.create({
                data: {
                    customer_id: customer.id,
                    password: hashedPassword,
                    account_id: data.email,
                    provider_id: "credentials"
                }
            })
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al crear al cliente");
            throw new BadRequestException("Ocurrio un error inesperado al crear al cliente")
        }).then(async () => {
            await this.cache.removeData({ entity: `register:verification:token:${args.data.email}`, query: { sessionId: args.data.session_id } });
        });
        return `Registro completado exitosamente`
    };

    async findOne({ uuid }: { uuid: string }) {
        return await this.prisma.customer.findUnique({ where: { uuid }, omit: { id: true, } });
    };

    async findAll(args: { page: number, limit: number }) {
        return await this.cache.remember({
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
        return await this.cache.remember({
            method: "staleWhileRevalidate",
            entity: "customer",
            query: { customer: args.uuid },
            fallback: async () => {
                return await this.prisma.customer.findUnique({ where: { uuid: args.uuid }, omit: { id: true } });
            }
        })
    };


    async findManyReviews(args: { customerUUID: string }): Promise<GetCustomerReviews[]> {
        return await this.cache.remember<GetCustomerReviews[]>({
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
                                    where: { mainImage: true },
                                    select: { imageUrl: true }
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
                        product_version_images: reviews.product_version.product_version_images.map(i => ({
                            image_url: i.imageUrl,
                        })),
                        category_name: reviews.product_version.product.category.name,
                        subcategories: reviews.product_version.product.subcategories.map((subcategories) => subcategories.subcategories.description),
                    }
                })) satisfies GetCustomerReviews[];
            }
        });
    };

    async update({ customerUUID, dto }: { customerUUID: string, dto: UpdateCustomerDTO }) {
        const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { email: true, accounts: { select: { password: true } } } });
        if (!customer) throw new NotFoundException("Cliente no encontrado");
        if (!customer.accounts.length) throw new BadRequestException("Cliente no tiene una cuenta");
        const isPasswordValid = await bcrypt.compare(dto.current_password, customer.accounts[0].password);
        if (!isPasswordValid) throw new BadRequestException("Contraseña actual incorrecta");

        await this.prisma.customer.update({
            where: { uuid: customerUUID },
            data: {
                name: dto.name,
                last_name: dto.last_name,
            }
        });
        return "Información actualizada exitosamente";
    };

};
