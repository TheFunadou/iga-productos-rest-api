import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()
export class OffersUtilsService {
    constructor(
        private readonly prisma: PrismaService
    ) { };

    async checkSingleProductVersionDiscount(args: {
        versionId: string,
        productId: string,
        categoryId: string,
        subcategoryIds: string[]
    }): Promise<{ discount: number, isOffer: boolean }> {
        const now = new Date();

        // Query para ofertas aplicables a este producto específico
        const applicableOffers = await this.prisma.offerTarget.findMany({
            where: {
                OR: [
                    { target_type: 'PRODUCT_VERSION', target_id: args.versionId },
                    { target_type: 'PRODUCT', target_id: args.productId },
                    { target_type: 'CATEGORY', target_id: args.categoryId },
                    { target_type: 'SUBCATEGORY', target_uuid_path: { hasSome: args.subcategoryIds } }
                ],
                offer: {
                    status: 'ACTIVE',
                    type: 'PERCENTAGE', // Solo PERCENTAGE, no COUPON
                    start_date: { lte: now },
                    end_date: { gte: now },
                    OR: [
                        { max_uses: null },
                        {
                            max_uses: { not: null },
                            current_uses: { lt: this.prisma.offers.fields.max_uses }
                        }
                    ]
                }
            },
            select: {
                offer: {
                    select: {
                        discount_percentage: true
                    }
                }
            }
        });

        // Si hay ofertas, retornar el descuento máximo
        if (applicableOffers.length > 0) {
            const maxDiscount = Math.max(...applicableOffers.map(o => o.offer.discount_percentage));
            return { discount: maxDiscount, isOffer: true };
        }

        // Sin descuento
        return { discount: 0, isOffer: false };
    }

    async checkMultipleProductVersionsDiscounts(
        productVersions: Array<{
            versionId: string,
            productId: string,
            categoryId: string,
            subcategoryIds: string[]
        }>,
        tx?: any
    ): Promise<Map<string, { discount: number, isOffer: boolean }>> {
        const prisma = tx || this.prisma;
        const now = new Date();
        const versionIds = productVersions.map(pv => pv.versionId);
        const productIds = [...new Set(productVersions.map(pv => pv.productId))];
        const categoryIds = [...new Set(productVersions.map(pv => pv.categoryId))];
        const allSubcategoryIds = [...new Set(productVersions.flatMap(pv => pv.subcategoryIds))];
        // Una sola query para todas las ofertas aplicables
        const applicableOffers = await prisma.offerTarget.findMany({
            where: {
                OR: [
                    { target_type: 'PRODUCT_VERSION', target_id: { in: versionIds } },
                    { target_type: 'PRODUCT', target_id: { in: productIds } },
                    { target_type: 'CATEGORY', target_id: { in: categoryIds } },
                    { target_type: 'SUBCATEGORY', target_uuid_path: { hasSome: allSubcategoryIds } }
                ],
                offer: {
                    status: 'ACTIVE',
                    type: 'PERCENTAGE',
                    start_date: { lte: now },
                    end_date: { gte: now },
                    OR: [
                        { max_uses: null },
                        {
                            max_uses: { not: null },
                            current_uses: { lt: prisma.offers.fields.max_uses }
                        }
                    ]
                }
            },
            select: {
                target_type: true,
                target_id: true,
                target_uuid_path: true,
                offer: {
                    select: {
                        discount_percentage: true
                    }
                }
            }
        });
        // Mapear descuentos a cada versión
        const discountMap = new Map<string, { discount: number, isOffer: boolean }>();
        for (const pv of productVersions) {
            const matchingOffers = applicableOffers.filter(offer => {
                if (offer.target_type === 'PRODUCT_VERSION') return offer.target_id === pv.versionId;
                if (offer.target_type === 'PRODUCT') return offer.target_id === pv.productId;
                if (offer.target_type === 'CATEGORY') return offer.target_id === pv.categoryId;
                if (offer.target_type === 'SUBCATEGORY') return pv.subcategoryIds.some(subId => offer.target_uuid_path.includes(subId));
                return false;
            });
            if (matchingOffers.length > 0) {
                const maxDiscount = Math.max(...matchingOffers.map(o => o.offer.discount_percentage));
                discountMap.set(pv.versionId, { discount: maxDiscount, isOffer: true });
            } else {
                discountMap.set(pv.versionId, { discount: 0, isOffer: false });
            }
        }
        return discountMap;
    }

    async checkMultipleProductVersionsDiscountsByCoupon(
        args: {
            couponCode: string,
            productVersions: Array<{
                versionId: string,
                productId: string,
                categoryId: string,
                subcategoryIds: string[]
            }>
        }
    ): Promise<Map<string, { discount: number, isOffer: boolean }>> {
        const now = new Date();
        const versionIds = args.productVersions.map(pv => pv.versionId);
        const productIds = [...new Set(args.productVersions.map(pv => pv.productId))];
        const categoryIds = [...new Set(args.productVersions.map(pv => pv.categoryId))];
        const allSubcategoryIds = [...new Set(args.productVersions.flatMap(pv => pv.subcategoryIds))];

        // Buscar ofertas aplicables con el código de cupón
        const applicableOffers = await this.prisma.offerTarget.findMany({
            where: {
                OR: [
                    { target_type: 'PRODUCT_VERSION', target_id: { in: versionIds } },
                    { target_type: 'PRODUCT', target_id: { in: productIds } },
                    { target_type: 'CATEGORY', target_id: { in: categoryIds } },
                    { target_type: 'SUBCATEGORY', target_uuid_path: { hasSome: allSubcategoryIds } }
                ],
                offer: {
                    code: args.couponCode,
                    status: 'ACTIVE',
                    type: 'COUPON',
                    start_date: { lte: now },
                    end_date: { gte: now },
                    OR: [
                        { max_uses: null },
                        {
                            max_uses: { not: null },
                            current_uses: { lt: this.prisma.offers.fields.max_uses }
                        }
                    ]
                }
            },
            select: {
                target_type: true,
                target_id: true,
                target_uuid_path: true,
                offer: {
                    select: {
                        discount_percentage: true
                    }
                }
            }
        });

        // Si no se encontró ninguna oferta aplicable con el cupón, lanzar excepción
        if (applicableOffers.length === 0) {
            throw new BadRequestException("Código de cupón invalido");
        }

        // Mapear descuentos a cada versión
        const discountMap = new Map<string, { discount: number, isOffer: boolean }>();
        for (const pv of args.productVersions) {
            const matchingOffers = applicableOffers.filter(offer => {
                if (offer.target_type === 'PRODUCT_VERSION') return offer.target_id === pv.versionId;
                if (offer.target_type === 'PRODUCT') return offer.target_id === pv.productId;
                if (offer.target_type === 'CATEGORY') return offer.target_id === pv.categoryId;
                if (offer.target_type === 'SUBCATEGORY') return pv.subcategoryIds.some(subId => offer.target_uuid_path.includes(subId));
                return false;
            });
            if (matchingOffers.length > 0) {
                const maxDiscount = Math.max(...matchingOffers.map(o => o.offer.discount_percentage));
                discountMap.set(pv.versionId, { discount: maxDiscount, isOffer: true });
            } else {
                discountMap.set(pv.versionId, { discount: 0, isOffer: false });
            }
        }
        return discountMap;
    }

};