export interface OrderItem {
    name: string;
    qty: number;
    image_url: string;
    discount: number;
    price: number;
    finalPrice: number;
}

export interface OrderConfirmationEmailProps {
    orderUUID: string;
    items: OrderItem[];
    total: string;
}