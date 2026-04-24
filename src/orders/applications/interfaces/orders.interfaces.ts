import { OrderAndPaymentStatus } from "@prisma/client";
import { PaymentProviders } from "src/orders/payment/payment.dto";

export interface OrderI {
    uuid: string;
    buyer: { name: string, surname: string, email?: string | null, phone?: string | null };
    isGuestOrder: boolean;
    paymentProvider: PaymentProviders;
    status: OrderAndPaymentStatus;
    totalAmount: string;
    couponCode?: string | null;
    exchange: "MXN" | "USD";
    createdAt: Date;
    updatedAt: Date;
};

export interface OrdersDashboardI {
    data: OrderI[];
    totalPages: number;
    totalRecords: number;
    currentPage: number;
};