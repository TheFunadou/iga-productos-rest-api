import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductVersionDTO, GetStockDashboard, PatchProductVersionDTO, SafeProductVersionImages, SearchProductVersionsDTO, StockDashboardParams, UpdateStockBySKUDTO } from './product-version.dto';
import { Decimal } from '@prisma/client/runtime/index-browser';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserLogEvent } from 'src/audit/user-log.event';

@Injectable()
export class ProductVersionService {
    private readonly logger = new Logger(ProductVersionService.name);
    private readonly nodeEnv = process.env.NODE_ENV;
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly eventEmmiter: EventEmitter2
    ) { };

    async create({ data, userUUID }: { data: CreateProductVersionDTO, userUUID: string }) {
        const { father_uuid, version_images, ...versionAttributes } = data;

        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { uuid: father_uuid }, select: { id: true } });
            if (!product) throw new NotFoundException("No se encontro el producto padre relacionado a la version");
            const created = await tx.productVersion.create({
                data: {
                    ...versionAttributes,
                    sku: versionAttributes.sku.toUpperCase(),
                    unit_price: new Decimal(versionAttributes.unit_price),
                    product_id: product.id
                },
                select: { sku: true, id: true }
            });
            await this.createVersionImages({ tx, versionImages: version_images, productVersionId: created.id });
            await this.cache.invalidateMultipleEntities([
                { entity: "product:detail" },
                { entity: "product-version:list" },
                { entity: "product-version:stock:dashboard" }
            ]);

            this.eventEmmiter.emit("user.log", new UserLogEvent(
                "PRODUCT_VERSION",
                created.sku,
                "Creación de versión de producto",
                userUUID
            ));

            return `Version ${created.sku} creada satisfactoriamente`;
        });
    };

    private async createVersionImages(args: { tx?: any, versionImages: SafeProductVersionImages[], productVersionId: string }) {
        if (args.tx) {
            return await args.tx.productVersionImages.createMany({
                data: args.versionImages.map((img) => ({
                    product_version_id: args.productVersionId,
                    image_url: img.image_url,
                    main_image: img.main_image
                }))
            });
        };
        return await this.prisma.productVersionImages.createMany({
            data: args.versionImages.map((img) => ({
                product_version_id: args.productVersionId,
                image_url: img.image_url,
                main_image: img.main_image
            }))
        });
    };

    async patch({ data: { fatherUUID, productVersionSKU, product_version: data, version_images }, userUUID }: { data: PatchProductVersionDTO, userUUID: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { uuid: fatherUUID }, select: { id: true } });
            if (!product) throw new NotFoundException("No se encontro el producto padre relacionado a la version");
            if (data.main_version) {
                await tx.productVersion.updateMany({
                    where: { product_id: product.id },
                    data: { main_version: false }
                });
            };
            const udpated = await tx.productVersion.update({
                where: { sku: productVersionSKU },
                data: {
                    ...data,
                    unit_price: data.unit_price ? new Decimal(data.unit_price) : undefined,
                }
            }).catch((error) => {
                if (this.nodeEnv === "DEV") this.logger.error(error);
                this.logger.error("Error al actualizar la version del producto");
                throw new BadRequestException("Error al actualizar la version del producto");
            });
            this.logger.log(`Version ${udpated.sku} actualizada`);
            if (version_images) {
                await tx.productVersionImages.deleteMany({ where: { product_version_id: udpated.id } });
                await this.createVersionImages({ tx, versionImages: version_images, productVersionId: udpated.id });
                this.logger.log(`Imagenes de version ${udpated.sku} actualizadas`);
            };
            this.logger.log(`Version ${udpated.sku} actualizada satisfactoriamente`);
            await this.cache.invalidateQuery({ entity: "product:detail", query: { uuid: fatherUUID } });

            this.eventEmmiter.emit("user.log", new UserLogEvent(
                "PRODUCT_VERSION",
                udpated.sku,
                "Actualización de versión de producto",
                userUUID
            ));
            return `Version ${udpated.sku} actualizada satisfactoriamente`;
        });
    };

    async delete({ sku, userUUID }: { sku: string, userUUID: string }): Promise<string> {
        return await this.prisma.$transaction(async (tx) => {
            const deleted = await tx.productVersion.delete({ where: { sku }, select: { id: true, sku: true, main_version: true, product: { select: { id: true } } } });
            if (deleted.main_version) {
                const list = await tx.productVersion.findMany({
                    where: { product_id: deleted.product.id },
                    select: { id: true }
                });

                const random = list[Math.floor(Math.random() * list.length)];
                await tx.productVersion.update({
                    where: { id: random.id },
                    data: { main_version: true }
                })
            };
            await this.cache.invalidateMultipleEntities([
                { entity: "product-version:search:cards" },
                { entity: "product-version:show-details" }
            ])
            await tx.productVersionImages.deleteMany({ where: { product_version_id: deleted.id } });

            this.eventEmmiter.emit("user.log", new UserLogEvent(
                "PRODUCT_VERSION",
                deleted.sku,
                "Eliminación de versión de producto",
                userUUID
            ));

            return `Version ${deleted.sku} eliminada exitosamente`;
        });
    }

    async list(args: { input: string }): Promise<SearchProductVersionsDTO[]> {
        if (!args.input || args.input.length < 4) return [];
        return await this.cache.remember<SearchProductVersionsDTO[]>({
            method: "staleWhileRevalidate",
            entity: "product-version:list",
            query: { input: args.input },
            fallback: async () => {
                const results = await this.prisma.productVersion.findMany({
                    take: 10,
                    where: { product: { product_name: { contains: args.input, mode: "insensitive" } } },
                    select: {
                        sku: true,
                        color_name: true,
                        product: { select: { product_name: true, category: { select: { name: true } } } }
                    }
                });

                return results.map((rs) => ({
                    product_name: rs.product.product_name,
                    category: rs.product.category.name,
                    sku: rs.sku,
                    color: rs.color_name
                }));
            }
        });
    };

    async stockDashboard({ params: { orderBy, limit, page, type, value } }: { params: StockDashboardParams }): Promise<GetStockDashboard> {
        if (!limit || !page) throw new BadRequestException("Los parametros de paginacion son requeridos");
        if (!orderBy) throw new BadRequestException("El ordenamiento es requerido");
        return await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "product-version:stock:dashboard",
            query: { params: { orderBy, limit, page, type, value } },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 10
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
                    where = { sku: value.toUpperCase() }
                };
                const data = await this.prisma.productVersion.findMany({
                    take: limit,
                    skip: (page - 1) * limit,
                    orderBy: { stock: orderBy },
                    where,
                    select: {
                        sku: true,
                        color_line: true,
                        color_code: true,
                        stock: true,
                        product_version_images: {
                            where: { main_image: true },
                            take: 1,
                            select: { image_url: true }
                        }
                    },

                }).catch((error) => {
                    if (this.nodeEnv === "DEV") this.logger.error(error);
                    this.logger.error(`Ocurrio un error inesperado al obtener el stock del producto`);
                    throw new BadRequestException(`Ocurrio un error inesperado al obtener el stock del producto`, this.nodeEnv === "DEV" && error);
                });

                const totalRecords = await this.prisma.productVersion.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                const response: GetStockDashboard = {
                    data: data.map((pv) => ({
                        sku: pv.sku,
                        color_code: pv.color_code,
                        color_line: pv.color_line,
                        stock: pv.stock,
                        product_version_images: pv.product_version_images[0]?.image_url || "",
                    })),
                    totalPages,
                    totalRecords
                }
                return response;
            }
        })
    }

    async updateStock({ dto: { sku, stock }, userUUID }: { dto: UpdateStockBySKUDTO, userUUID: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const productVersion = await tx.productVersion.findUnique({ where: { sku }, select: { id: true } });
            if (!productVersion) throw new NotFoundException("No se encontro la version de producto");
            await tx.productVersion.update({ where: { sku }, data: { stock } }).catch((error) => {
                if (this.nodeEnv === "DEV") this.logger.error(error);
                this.logger.error(`Ocurrio un error inesperado al actualizar el stock del version ${sku}`);
                throw new BadRequestException(`Ocurrio un error inesperado al actualizar el stock del version ${sku}`, this.nodeEnv === "DEV" && error);
            });
            await this.cache.invalidateEntity({ entity: "product-version:stock:dashboard" });
            this.eventEmmiter.emit("user.log", new UserLogEvent(
                "PRODUCT_VERSION",
                sku,
                "Actualización de stock de versión de producto",
                userUUID
            ));
            return `Stock de la version ${sku} actualizado satisfactoriamente`;
        });
    };








};
