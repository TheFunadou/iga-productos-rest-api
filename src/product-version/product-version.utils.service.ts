import { Injectable } from "@nestjs/common";
import { PRODUCT_VERSION_DETAIL_BASE_SELECT, FormatPVCardsSelect, ProductVersionDetailSelect } from "./helpers";
import { ProductVersionCard, ProductVersionDetail } from "./product-version.dto";

@Injectable()
export class ProductVersionUtilsService {

    constructor() { };

    private buildShowDetailsSelect(args: { customerUUID?: string }) {
        if (args.customerUUID) {
            return {
                ...PRODUCT_VERSION_DETAIL_BASE_SELECT,
                customer_favorites: {
                    where: { customer: { uuid: args.customerUUID } },
                    select: { added_at: true }
                },
                reviews: { where: { customer: { uuid: args.customerUUID } }, select: { created_at: true } }
            };
        };
        return PRODUCT_VERSION_DETAIL_BASE_SELECT;
    };


    private buildShowDetailsQuery(args: { sku: string, customerUUID?: string }) {
        return args.customerUUID ? { sku: args.sku, customer: args.customerUUID } : { sku: args.sku }
    };

    formatDetail(args: { version: ProductVersionDetailSelect, discount?: number, isOffer?: boolean }): ProductVersionDetail {

        const formatParentVersions = args.version.product.product_versions.map(parents => {
            return {
                sku: parents.sku,
                unit_price: parents.unit_price,
                discount: 0,
                product_images: parents.product_version_images
            }
        });

        const unitPriceWithDiscount = args.discount ? parseFloat(args.version.unit_price) - (parseFloat(args.version.unit_price) * (args.discount / 100)) : 0;

        return {
            product: {
                uuid: args.version.product.uuid,
                applications: args.version.product.applications,
                certifications_desc: args.version.product.certifications_desc,
                description: args.version.product.description,
                product_name: args.version.product.product_name,
                recommendations: args.version.product.recommendations,
                specs: args.version.product.specs
            },
            subcategories: args.version.product.subcategories.map(sub => sub.subcategories.description),
            product_images: args.version.product_version_images,
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
                unit_price_with_discount: args.isOffer ? unitPriceWithDiscount.toFixed(2).toString() : undefined
            },
            parent_versions: formatParentVersions ?? [],
            discount: args.discount ?? 0,
            isFavorite: (args.version.customer_favorites?.length ?? 0) > 0,
            isOffer: args.isOffer ?? false,
            isReviewed: (args.version.reviews?.length ?? 0) > 0
        };
    };


    formatCards(args: { data: FormatPVCardsSelect[], discountsMap?: Map<string, { discount: number, isOffer: boolean }> }): ProductVersionCard[] {
        const { data } = args;
        const { discountsMap } = args;
        return data.map(cards => {
            const discountInfo = discountsMap?.get(cards.id.toString()) || { discount: 0, isOffer: false };
            const unitPriceWithDiscount = parseFloat(cards.unit_price) - (parseFloat(cards.unit_price) * (discountInfo.discount / 100));
            return {
                product_name: cards.product.product_name,
                subcategories: cards.product.subcategories.map(sub => sub.subcategories.description),
                category: cards.product.category.name,
                product_images: cards.product_version_images,
                product_version: {
                    sku: cards.sku,
                    unit_price: cards.unit_price,
                    unit_price_with_discount: discountInfo.isOffer ? unitPriceWithDiscount.toFixed(2).toString() : undefined,
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
};