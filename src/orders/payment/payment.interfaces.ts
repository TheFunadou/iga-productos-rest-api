export interface ProcessPaymentJob {
    paymentId: string;
    timestamp: string;
    nodeEnv: string;
}
export interface OrderProcessingStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    orderUUID?: string;
    updatedAt: string;
    error?: string;
}