interface ProcessPaymentJob {
    paymentId: string;
    timestamp: string;
}
interface OrderProcessingStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    orderUUID?: string;
    updatedAt: string;
    error?: string;
}