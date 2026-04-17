export interface ProductVersionCardI {
    productUUID: string
    name: string
    category: { uuid: string, name: string }
    subcategories: { uuid: string, name: string }[]
    sku: string
    codeBar?: string
    color: { line: string, name: string, code: string }
    unitPrice: string
    finalPrice: string
    isFavorite: boolean
    stock: number
    images: { url: string, mainImage: boolean }[]
    rating: number
    offer: { isOffer: boolean, discount: number }
    parents: { sku: string, colorCode: string }[]
};