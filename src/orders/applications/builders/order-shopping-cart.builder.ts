import { ProductI, ProductVersionI, ProductVersionUnitPriceI, ResolvedOfferI } from "src/product-version/application/pipelines/interfaces/get-cards.interface";
import { OrderShoppingCartI } from "../pipeline/interfaces/order.interface";

/**
 * Builder pattern para construir ProductVersionCardI
 * Encapsula la logica de construccion de tarjetas de producto
 */
export class OrderShoppingCartBuilder {
    private versionId: string = "";
    private productUUID: string = "";
    private sku: string = "";
    private subcategories: string[] = [];
    private imageUrl: string = "";
    private productName: string = "";
    private category: string = "";
    private unitPrice: string = "0.00";
    private finalPrice: string = "0.00";
    private quantity: number = 0;
    private offer: { isOffer: boolean, discount: number } = { isOffer: false, discount: 0 };
    private subtotal: string = "0.00";

    /**
     * Establece la informacion basica del producto
     */
    withProduct(product: ProductI): this {
        this.productUUID = product.uuid;
        this.category = product.category.name;
        this.productName = product.name;
        this.subcategories = product.subcategories.map(s => s.name);
        return this;
    }

    /**
     * Establece la informacion de la version del producto
     */
    withProductVersion(productVersion: ProductVersionI): this {
        this.versionId = productVersion.id;
        this.sku = productVersion.sku;
        this.imageUrl = productVersion.images.find(img => img.mainImage)?.url || ""
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
    /**
     * Establece la informacion de oferta si aplica
     */
    withOffer(offerData: ResolvedOfferI | undefined): this {
        if (offerData && offerData.finalDiscount > 0) {
            this.offer = {
                isOffer: true,
                discount: offerData.finalDiscount
            };
            const originalPrice = parseFloat(this.unitPrice);
            const discountAmount = originalPrice * (offerData.finalDiscount / 100);
            this.finalPrice = (originalPrice - discountAmount).toFixed(2);
        } else {
            // Aseguramos que siempre haya un objeto de oferta, incluso si no hay descuento
            this.offer = { isOffer: false, discount: 0 };
            this.finalPrice = this.unitPrice;
        }
        return this;
    }

    /**
     * Establece la cantidad del producto
     */
    withQuantity(quantity: number): this {
        this.quantity = quantity;
        this.subtotal = (parseFloat(this.finalPrice) * quantity).toFixed(2);
        return this;
    }


    /**
     * Valida y construye la tarjeta. Lanza error si faltan datos requeridos
     */
    build(): OrderShoppingCartI {
        if (!this.productName) {
            throw new Error(`ProductVersionCardBuilder: El nombre del producto es requerido`);
        }
        if (!this.sku) {
            throw new Error(`ProductVersionCardBuilder: El SKU es requerido`);
        }


        return {
            versionId: this.versionId,
            productUUID: this.productUUID,
            sku: this.sku,
            imageUrl: this.imageUrl,
            subcategories: this.subcategories,
            productName: this.productName,
            category: this.category,
            unitPrice: this.unitPrice,
            finalPrice: this.finalPrice,
            quantity: this.quantity,
            offer: this.offer,
            subtotal: this.subtotal
        };
    }
}

/**
 * Director que orquesta la construccion de una tarjeta a partir de los datos del contexto
 */
export class OrderShoppingCartDirector {
    /**
     * Construye una tarjeta de producto usando el builder proporcionado
     */
    static createCard(
        builder: OrderShoppingCartBuilder,
        opts: {
            product: ProductI;
            productVersion: ProductVersionI;
            unitPrice: ProductVersionUnitPriceI;
            offer?: ResolvedOfferI;
            quantity: number;
        }
    ): OrderShoppingCartI {
        return builder
            .withProduct(opts.product)
            .withProductVersion(opts.productVersion)
            .withUnitPrice(opts.unitPrice)
            .withOffer(opts.offer)
            .withQuantity(opts.quantity)
            .build();
    }
}
