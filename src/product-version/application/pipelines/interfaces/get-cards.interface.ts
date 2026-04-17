import { OfferStatus } from "@prisma/client"

export interface ProductListI {
    productUUID: string
    sku: string[]
};

export interface ProductI {
    id: string
    uuid: string
    name: string
    category: { id: string, uuid: string, name: string }
    subcategories: { uuid: string, name: string }[]
    details: {
        specs: string;
        description: string;
        applications: string;
        recommendations: string;
        certsDesc: string;
    }
    createdAt: Date
    updatedAt: Date
};

export interface ProductVersionI {
    id: string
    sku: string
    codeBar?: string
    color: { line: string, name: string, code: string }
    status: string
    technicalSheetUrl: string
    parents: { id: string, sku: string, colorCode: string, imageUrl: string }[]
    images: { url: string, mainImage: boolean }[]
    rating: number;
    createdAt: Date;
    updatedAt: Date;
};


export interface ProductVersionStockI {
    sku: string
    stock: number
};

export interface ProductVersionUnitPriceI {
    sku: string
    unitPrice: string
};

export interface ProductVersionOfferI {
    sku: string
    applicableOffers: string[]
};

export interface OfferI {
    id: string
    uuid: string
    discount: number
    code?: string
    type: "PERCENTAGE" | "COUPON"
    startDate: Date
    endDate: Date
    minPurchaseAmount: string
    maxPurchaseAmount: string
    priority: number
    isExclusive: boolean
    stackGroup: "BASE" | "COUPON" | "SHIPPING"
    maxStack: number
    createdAt: Date
};

// Resultado por SKU después de resolver el stacking
export interface ResolvedOfferI {
    sku: string
    applicableOffers: OfferI[]   // Las que ganaron tras resolver stacking
    finalDiscount: number         // Suma total de descuentos válidos
    isExclusive: boolean          // Si alguna de las aplicadas es exclusiva
    stackGroup: string            // Grupo dominante
}


export interface OfferStatusI {
    offerUUID: string
    status: OfferStatus
    currentUses: number
    maxUses: number
    lastUpdate: Date
}


export interface OfferLookupInputI {
    sku: string
    versionId: string       // product_version.id (para target_type PRODUCT_VERSION)
    productId: string       // product.id (para target_type PRODUCT)
    categoryId: string      // category.id (para target_type CATEGORY)
    subcategoryIds: string[] // uuids de subcategorías (para target_type SUBCATEGORY)
}
