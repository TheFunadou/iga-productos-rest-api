import { ProductI, ProductVersionI, ResolvedOfferI } from "../pipelines/interfaces/get-cards.interface";
import { BuildDetailsContext } from "../pipelines/get-details.context";
import { ProductVersionDetailedData, ProductVersionDetailsI, SafeParentDetailedI } from "../pipelines/interfaces/get-details.interface";

/**
 * Builder pattern for constructing ProductVersionDetailsI
 * Encapsulates the logic for building detailed product version information
 */
export class ProductVersionDetailsBuilder {
    private productUUID: string = "";
    private name: string = "";
    private category: { uuid: string, name: string } = { uuid: "", name: "" };
    private subcategories: { uuid: string, name: string }[] = [];
    private sku: string = "";
    private codeBar: string | undefined;
    private color: { line: string, name: string, code: string } = { line: "", name: "", code: "" };
    private unitPrice: string = "0";
    private finalPrice: string = "0";
    private isFavorite: boolean = false;
    private stock: number = 0;
    private images: { url: string, mainImage: boolean }[] = [];
    private rating: number = 0;
    private offer: { isOffer: boolean, discount: number } = { isOffer: false, discount: 0 };
    private parents: SafeParentDetailedI[] = [];
    private details: ProductVersionDetailedData = {
        techSheetUrl: "",
        status: "",
        description: "",
        specs: "",
        applications: "",
        recommendations: "",
        certsDesc: "",
        isReviewed: false
    }

    /**
     * Sets the basic product information
     */
    withProduct(product: ProductI): this {
        this.productUUID = product.uuid;
        this.name = product.name;
        this.category = { uuid: product.category.uuid, name: product.category.name };
        this.subcategories = product.subcategories;
        return this;
    }

    /**
     * Sets the product version information
     */
    withProductVersion(productVersion: {
        sku: string;
        codeBar?: string;
        color: { line: string, name: string, code: string };
        status: string;
        technicalSheetUrl: string;
        images: { url: string, mainImage: boolean }[];
        rating: number;
    }): this {
        this.sku = productVersion.sku;
        this.codeBar = productVersion.codeBar;
        this.color = productVersion.color;
        this.images = productVersion.images;
        this.rating = productVersion.rating;
        return this;
    }

    /**
     * Sets the unit price and calculates the final price
     */
    withUnitPrice(unitPrice: string): this {
        this.unitPrice = unitPrice;
        this.finalPrice = unitPrice; // Default: final price equals unit price
        return this;
    }

    /**
     * Sets the stock quantity
     */
    withStock(stock: number): this {
        this.stock = stock;
        return this;
    }

    /**
     * Sets the offer information and recalculates the final price
     */
    withOffer(offerData: ResolvedOfferI | undefined): this {
        if (offerData && offerData.finalDiscount > 0) {
            this.offer = {
                isOffer: true,
                discount: offerData.finalDiscount
            };

            // Calculate final price with discount
            const originalPrice = parseFloat(this.unitPrice);
            const discountAmount = originalPrice * (offerData.finalDiscount / 100);
            this.finalPrice = (originalPrice - discountAmount).toFixed(2);
        }
        return this;
    }

    /**
     * Sets whether the product is a customer favorite
     */
    isCustomerFavorite(favorites: string[]): this {
        this.isFavorite = favorites.includes(this.sku);
        return this;
    }

    /**
     * Sets the detailed parent information with resolved offers
     */
    withParents(parents: SafeParentDetailedI[]): this {
        this.parents = parents;
        return this;
    }

    withDetails({ versionData, productData, isReviewed }: { versionData: ProductVersionI, productData: ProductI, isReviewed: boolean }): this {
        this.details = {
            applications: productData.details.applications,
            recommendations: productData.details.recommendations,
            certsDesc: productData.details.certsDesc,
            specs: productData.details.specs,
            status: versionData.status,
            techSheetUrl: versionData.technicalSheetUrl,
            createdAt: versionData.createdAt,
            updatedAt: versionData.updatedAt,
            description: productData.details.description,
            isReviewed
        };
        return this;
    }

    /**
     * Validates and builds the product version details. Throws an error if required data is missing
     */
    build(): ProductVersionDetailsI {
        if (!this.name) {
            throw new Error("ProductVersionDetailsBuilder: Product name is required");
        }
        if (!this.sku) {
            throw new Error("ProductVersionDetailsBuilder: SKU is required");
        }
        if (!this.color.line || !this.color.name || !this.color.code) {
            throw new Error(`ProductVersionDetailsBuilder: Color information is required for SKU: ${this.sku}`);
        }
        if (!this.category.uuid || !this.category.name) {
            throw new Error(`ProductVersionDetailsBuilder: Category information is required for SKU: ${this.sku}`);
        }

        return {
            productUUID: this.productUUID,
            name: this.name,
            category: this.category,
            subcategories: this.subcategories,
            sku: this.sku,
            codeBar: this.codeBar,
            color: this.color,
            unitPrice: this.unitPrice,
            finalPrice: this.finalPrice,
            isFavorite: this.isFavorite,
            stock: this.stock,
            images: this.images,
            rating: this.rating,
            offer: this.offer,
            parents: this.parents,
            details: this.details
        };
    }

    /**
     * Static method to build product version details directly from context
     */
    static build(context: BuildDetailsContext): ProductVersionDetailsI {
        const {
            productEntity,
            productVersionEntity,
            stockEntities,
            priceEntities,
            offerMap,
            customerFavorites
        } = context;

        if (!productEntity || !productVersionEntity || context.isReviewed === undefined) {
            throw new Error("ProductVersionDetailsBuilder: Product and ProductVersion entities are required");
        }

        const builder = new ProductVersionDetailsBuilder();

        // Set basic product information
        builder.withProduct(productEntity);

        // Set product version information
        builder.withProductVersion({
            sku: productVersionEntity.sku,
            codeBar: productVersionEntity.codeBar,
            color: productVersionEntity.color,
            status: productVersionEntity.status,
            technicalSheetUrl: productVersionEntity.technicalSheetUrl,
            images: productVersionEntity.images,
            rating: productVersionEntity.rating
        });

        // Set unit price from price entities
        const mainSku = productVersionEntity.sku;
        const unitPrice = priceEntities?.get(mainSku);
        if (unitPrice) {
            builder.withUnitPrice(unitPrice);
        }

        // Set stock from stock entities
        const stock = stockEntities?.get(mainSku);
        if (stock !== undefined) {
            builder.withStock(stock);
        }

        // Set offer for the main product version
        const mainOffer = offerMap?.get(mainSku);
        if (mainOffer) {
            builder.withOffer(mainOffer);
        }

        // Set customer favorites
        const favorites = customerFavorites || [];
        builder.isCustomerFavorite(favorites);

        // Build detailed parent information
        const parentDetails: SafeParentDetailedI[] = productVersionEntity.parents.map(parent => {
            const parentUnitPrice = priceEntities?.get(parent.sku) || "0";
            const parentOffer = offerMap?.get(parent.sku);

            // Calculate final price for parent
            let parentFinalPrice = parentUnitPrice;
            if (parentOffer && parentOffer.finalDiscount > 0) {
                const originalPrice = parseFloat(parentUnitPrice);
                const discountAmount = originalPrice * (parentOffer.finalDiscount / 100);
                parentFinalPrice = (originalPrice - discountAmount).toFixed(2);
            }

            // Get parent image from version images (first image or main image)
            const parentImage = parent.imageUrl || "";

            return {
                sku: parent.sku,
                colorCode: parent.colorCode,
                imageUrl: parentImage,
                unitPrice: parentUnitPrice,
                finalPrice: parentFinalPrice,
                offer: parentOffer && parentOffer.finalDiscount > 0
                    ? { isOffer: true, discount: parentOffer.finalDiscount }
                    : { isOffer: false, discount: 0 }
            } as SafeParentDetailedI;
        });

        builder.withParents(parentDetails);

        builder.withDetails({ productData: productEntity, versionData: productVersionEntity, isReviewed: context.isReviewed });

        return builder.build();
    }
}
