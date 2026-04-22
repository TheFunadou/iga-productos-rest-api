import { OrderAndPaymentStatus } from "@prisma/client";
import { MercadoPagoPaymentStatus } from "./payment.dto";


export function isMercadoPagoStatus(value: string): value is MercadoPagoPaymentStatus {
    return [
        "approved", "rejected", "in_process",
        "cancelled", "authorized", "pending",
        "refunded", "in_mediation", "charged_back"
    ].includes(value);
};

export const formatMercadoPagoOrderStatus: Record<MercadoPagoPaymentStatus, OrderAndPaymentStatus> = {
    approved: "APPROVED",
    rejected: "REJECTED",
    in_process: "IN_PROCESS",
    cancelled: "CANCELLED",
    authorized: "AUTHORIZED",
    pending: "PENDING",
    refunded: "REFUNDED",
    in_mediation: "IN_MEDIATION",
    charged_back: "CHARGED_BACK"
};

