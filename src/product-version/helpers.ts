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


export const PRODUCT_VERSION_DETAIL_BASE_SELECT = {
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
            product_name: true,
            specs: true,
            recommendations: true,
            applications: true,
            certifications_desc: true,
            description: true,
            category: { select: { name: true } },
            subcategories: { select: { subcategories: { select: { description: true, } } } },
            product_sources: { select: { source_description: true, source_url: true } },
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