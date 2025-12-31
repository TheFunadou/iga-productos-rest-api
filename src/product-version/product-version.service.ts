import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductVersionDTO, PatchProductVersionDTO, SafeProductVersionImages, SearchProductVersionsDTO } from './product-version.dto';
import { Decimal } from '@prisma/client/runtime/index-browser';

@Injectable()
export class ProductVersionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };

    async create(args: { data: CreateProductVersionDTO }) {
        const { father_uuid, version_images, ...data } = args.data;

        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { uuid: father_uuid }, select: { id: true } });
            if (!product) throw new NotFoundException("No se encontro el producto padre relacionado a la version");
            const created = await tx.productVersion.create({
                data: {
                    ...data,
                    unit_price: new Decimal(data.unit_price),
                    product_id: product.id
                }
            });
            await this.createVersionImages({ tx, versionImages: version_images, productVersionId: created.id });
            // await this.cacheService.invalidateQuery({entity: "product-version:detail"})
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

    async patch(args: { data: PatchProductVersionDTO }) {
        const { father_uuid, version_images, ...data } = args.data;

        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { uuid: father_uuid }, select: { id: true } });
            if (!product) throw new NotFoundException("No se encontro el producto padre relacionado a la version");
            if (data.main_version) {
                await tx.productVersion.updateMany({
                    where: { product_id: product.id },
                    data: { main_version: false }
                });
            };
            const udpated = await tx.productVersion.update({
                where: { sku: data.sku },
                data: {
                    ...data,
                    unit_price: data.unit_price ? new Decimal(data.unit_price) : undefined,
                    product_id: product.id
                }
            });
            if (version_images) {
                await tx.productVersionImages.deleteMany({ where: { product_version_id: udpated.id } });
                await this.createVersionImages({ tx, versionImages: version_images, productVersionId: udpated.id });
            };
            return `Version ${udpated.sku} actualizada satisfactoriamente`;
        });
    };

    async delete(args: { sku: string }): Promise<string> {
        return await this.prisma.$transaction(async (tx) => {
            const deleted = await tx.productVersion.delete({ where: { sku: args.sku }, select: { id: true, sku: true, main_version: true, product: { select: { id: true } } } });
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
            await this.cacheService.invalidateMultipleEntities([
                { entity: "product-version:search:cards" },
                { entity: "product-version:show-details" }
            ])
            await tx.productVersionImages.deleteMany({ where: { product_version_id: deleted.id } });
            return `Version ${deleted.sku} eliminada exitosamente`;
        });
    }

    async list(args: { input: string }): Promise<SearchProductVersionsDTO[]> {
        if (!args.input || args.input.length < 4) return [];
        return await this.cacheService.remember<SearchProductVersionsDTO[]>({
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




};
