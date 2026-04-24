export interface CategorieI {
    uuid: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
};

export interface CategoriesSummary {
    categoryName: string;
    productVersion: {
        sku: string;
        productName: string;
        imageUrl: string;
    }[];
};

export interface ProductReviewsI {
    rating: number;
    title: string;
    comment: string;
    productVersion: {
        images: string[];
        categoryName: { uuid: string, name: string };
        subcategories: { uuid: string, name: string }[];
    }
};