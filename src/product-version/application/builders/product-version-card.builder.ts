import { ProductI, ProductVersionI, ProductVersionStockI, ProductVersionUnitPriceI, ResolvedOfferI } from "../pipelines/interfaces/get-cards.interface";
import { ProductVersionCardI } from "../pipelines/interfaces/product-version-card.interface";

/**
 * Builder pattern para construir ProductVersionCardI
 * Encapsula la logica de construccion de tarjetas de producto
 */
export class ProductVersionCardBuilder {
    private productUUID: string = "";
    private name: string = "";
    private subcategories: { uuid: string, name: string }[] = [];
    private sku: string = "";
    private codeBar: string | undefined;
    private color: { line: string, name: string, code: string } = { line: "", name: "", code: "" };
    private unitPrice: string = "0";
    private finalPrice: string = "0";
    private stock: number = 0;
    private isFavorite: boolean = false;
    private images: { url: string, mainImage: boolean }[] = [];
    private rating: number = 0;
    private offer: { isOffer: boolean, discount: number } = { isOffer: false, discount: 0 };
    private parents: { sku: string, colorCode: string }[] = [];
    private category: { uuid: string, name: string } = { uuid: "", name: "" };

    /**
     * Establece la informacion basica del producto
     */
    withProduct(product: ProductI): this {
        this.productUUID = product.uuid
        this.name = product.name;
        this.category = { uuid: product.category.uuid, name: product.category.name };
        this.subcategories = product.subcategories;
        return this;
    }

    /**
     * Establece la informacion de la version del producto
     */
    withProductVersion(productVersion: ProductVersionI): this {
        this.sku = productVersion.sku;
        this.codeBar = productVersion.codeBar;
        this.color = productVersion.color;
        this.images = productVersion.images;
        this.rating = productVersion.rating;
        this.parents = productVersion.parents.map(p => ({
            colorCode: p.colorCode,
            sku: p.sku
        }));
        return this;
    }

    /**
     * Establece el precio unitario del producto
     */
    withUnitPrice(unitPriceData: ProductVersionUnitPriceI): this {
        this.unitPrice = unitPriceData.unitPrice;
        this.finalPrice = unitPriceData.unitPrice; // Por defecto, el precio final es el precio unitario
        return this;
    };

    withStock(stockData: ProductVersionStockI): this {
        this.stock = stockData.stock;
        return this;
    }

    /**
     * Establece la informacion de oferta si aplica
     */
    withOffer(offerData: ResolvedOfferI | undefined): this {
        if (offerData && offerData.finalDiscount > 0) {
            this.offer = {
                isOffer: true,
                discount: offerData.finalDiscount
            };

            // Calcular precio final con descuento
            const originalPrice = parseFloat(this.unitPrice);
            const discountAmount = originalPrice * (offerData.finalDiscount / 100);
            this.finalPrice = (originalPrice - discountAmount).toFixed(2);
        }
        return this;
    }

    /**
     * Establece si el producto es favorito del cliente
     */
    isCustomerFavorite(favorites: string[]): this {
        this.isFavorite = favorites.includes(this.sku);
        return this;
    }

    /**
     * Valida y construye la tarjeta. Lanza error si faltan datos requeridos
     */
    build(): ProductVersionCardI {
        if (!this.name) {
            throw new Error(`ProductVersionCardBuilder: El nombre del producto es requerido`);
        }
        if (!this.sku) {
            throw new Error(`ProductVersionCardBuilder: El SKU es requerido`);
        }
        if (!this.color.line || !this.color.name || !this.color.code) {
            throw new Error(`ProductVersionCardBuilder: La informacion de color es requerida para SKU: ${this.sku}`);
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
            parents: this.parents
        };
    }
}

/**
 * Director que orquesta la construccion de una tarjeta a partir de los datos del contexto
 */
export class ProductVersionCardDirector {
    /**
     * Construye una tarjeta de producto usando el builder proporcionado
     */
    static createCard(
        builder: ProductVersionCardBuilder,
        opts: {
            product: ProductI;
            productVersion: ProductVersionI;
            unitPrice: ProductVersionUnitPriceI;
            stock: ProductVersionStockI;
            offer?: ResolvedOfferI;
            customerFavorites: string[];
        }
    ): ProductVersionCardI {
        return builder
            .withProduct(opts.product)
            .withProductVersion(opts.productVersion)
            .withUnitPrice(opts.unitPrice)
            .withStock(opts.stock)
            .withOffer(opts.offer)
            .isCustomerFavorite(opts.customerFavorites)
            .build();
    }
}
