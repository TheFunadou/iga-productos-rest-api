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