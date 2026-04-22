import { ShippingStatus } from "@prisma/client";

export interface ShippingI {
    uuid: string;
    orderUUID: string;
    shippingStatus: ShippingStatus;
    concept: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    shippingAmount: string;
    insuranceAmount?: string | null;
    boxesCount: number;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export interface ShippingDashboardI {
    data: ShippingI[],
    totalPages: number;
    totalRecords: number;
    currentPage: number;
};

export interface CustomerShippingDetailsI {
    carrier?: string
    trackingNumber?: string;
    shippingAmount: string;
    boxesCount: number;
    shippedAt?: string;
    deliveredAt?: string;
};

export interface CreateShippingByApprovedOrderI {
    concept: string;
    boxesCount: number;
    shippingStatus: ShippingStatus;
    shippingAmount: string;
}