export interface ProductVersionCardSelect {
    id: number;
    unit_price: string;
    sku: string;
    color_line: string;
    color_name: string;
    color_code: string;
    stock: number;
    product_version_images: {
        main_image: boolean;
        image_url: string;
    }[];
    product: {
        id: number;
        product_name: string;
        category_id: number;
        category: {
            name: string;
        };
        subcategories: {
            subcategories: {
                uuid: string;
                description: string;
            };
        }[];
    };
    customer_favorites?: { added_at: Date; }[];
}

export const PRODUCT_VERSION_CARD_BASE_SELECT = {
    id: true,
    unit_price: true,
    sku: true,
    color_line: true,
    color_name: true,
    color_code: true,
    stock: true,
    product_version_images: {
        where: { main_image: true },
        select: { main_image: true, image_url: true },
        orderBy: { main_image: "desc" as const }
    },
    product: {
        select: {
            id: true,
            category_id: true,
            product_name: true,
            category: { select: { name: true } },
            subcategories: { select: { subcategories: { select: { uuid: true, description: true } }, }, }
        }
    }
};
export interface ProductVersionDetailSelect {
    id: number;
    sku: string;
    color_line: string;
    color_name: string;
    color_code: string;
    status: string;
    stock: number;
    unit_price: string;
    technical_sheet_url: string;
    product_version_images: {
        main_image: boolean;
        image_url: string;
    }[];
    product: {
        id: string;             // <-- NUEVO CAMPO AÑADIDO
        category_id: string;    // <-- NUEVO CAMPO AÑADIDO
        uuid: string;
        product_name: string;
        specs: string;
        recommendations: string;
        applications: string;
        certifications_desc: string;
        description: string;
        category: {
            id: number;
            name: string;
        };
        subcategories: {
            subcategories: {
                uuid: string;
                description: string;
            };
        }[];
        product_resources: {
            resource_description: string;
            resource_url: string;
        }[];
        product_versions: {
            sku: string;
            unit_price: string;
            product_version_images: {
                image_url: string;
            }[];
        }[];
    };
    customer_favorites?: { added_at: Date; }[];
    reviews?: { created_at: Date; }[];
};


export const PRODUCT_VERSION_DETAIL_BASE_SELECT = {
    id: true,
    sku: true,
    color_line: true,
    color_name: true,
    color_code: true,
    status: true,
    stock: true,
    unit_price: true,
    technical_sheet_url: true,
    product_version_images: {
        omit: { id: true, product_version_id: true },
        orderBy: { main_image: 'desc' as const }
    },
    product: {
        select: {
            id: true,            // <-- NUEVO CAMPO AÑADIDO
            category_id: true,   // <-- NUEVO CAMPO AÑADIDO
            uuid: true,
            product_name: true,
            specs: true,
            recommendations: true,
            applications: true,
            certifications_desc: true,
            description: true,
            category: { select: { id: true, name: true } },
            subcategories: { select: { subcategories: { select: { uuid: true, description: true, } } } },
            product_resources: { select: { resource_description: true, resource_url: true } },
            product_versions: {
                select: {
                    sku: true, unit_price: true,
                    product_version_images: { where: { main_image: true, }, select: { image_url: true, } }
                },
                orderBy: { sku: 'asc' as const }
            }
        }
    }
};
