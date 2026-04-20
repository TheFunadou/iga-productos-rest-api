export interface ParentBaseI {
    id: string; // Crucial para resolver la oferta a target_type PRODUCT_VERSION
    sku: string;
    colorCode: string;
};

export interface ParentDetailedI extends ParentBaseI {
    imageUrl: string;
    unitPrice: string;
    finalPrice: string;
    offer: { isOffer: boolean, discount: number };
};

export interface SafeParentDetailedI extends Omit<ParentBaseI, "id"> {
    imageUrl: string;
    unitPrice: string;
    finalPrice: string;
    offer: { isOffer: boolean, discount: number };
};

export interface ProductVersionDetailedData {
    techSheetUrl: string;
    status: string;
    description: string;
    specs: string;
    applications: string;
    recommendations: string;
    certsDesc: string;
    createdAt?: Date;
    updatedAt?: Date;
    isReviewed: boolean;
};

export interface ProductVersionDetailsI {
    productUUID: string
    name: string;
    category: { uuid: string, name: string };
    subcategories: { uuid: string, name: string }[];
    sku: string;
    codeBar?: string;
    color: { line: string, name: string, code: string };
    unitPrice: string;
    finalPrice: string;
    isFavorite: boolean;
    stock: number;
    images: { url: string, mainImage: boolean }[];
    rating: number;
    offer: { isOffer: boolean, discount: number };
    parents: SafeParentDetailedI[];
    details: {
        techSheetUrl: string;
        status: string;
        specs: string;
        applications: string;
        recommendations: string;
        certsDesc: string;
        createdAt?: Date;
        updatedAt?: Date;
        isReviewed: boolean;
    };
}
