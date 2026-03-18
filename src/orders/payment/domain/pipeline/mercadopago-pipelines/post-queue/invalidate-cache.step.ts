import { Logger } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { ShoppingCartService } from "src/customer/shopping-cart/shopping-cart.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";
import { OrderProcessingStatus } from "src/orders/payment/payment.interfaces";

export class InvalidateCacheStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(InvalidateCacheStep.name);

    constructor(
        private readonly cache: CacheService,
        private readonly shoppingCart: ShoppingCartService,
    ) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        if (context.skipped || !["APPROVED", "PENDING"].includes(context.orderStatus!)) return;
        const { orderUUID, customerUUID, orderId, orderStatus } = context;

        // Actualiza el estado de procesamiento a "completed" en cache
        await this.cache.setData<OrderProcessingStatus>({
            entity: "payment:status",
            query: { externalOrderId: context.paymentId },
            data: {
                status: "completed",
                orderUUID: orderUUID!,
                updatedAt: new Date().toISOString()
            },
            aditionalOptions: { ttlMilliseconds: 1000 * 60 * 60 }
        });

        // Invalida el cache de detalles de la orden
        await this.cache.invalidateQuery({
            entity: "order:paid:details",
            query: customerUUID ? { orderUUID, customerUUID } : { orderUUID }
        });

        if (orderStatus === "APPROVED" && orderId) {
            // Limpia el carrito del cliente si aplica
            if (customerUUID) {
                this.logger.log(`Procesando invalidación de cache para cliente autenticado ${customerUUID}`);
                await this.shoppingCart.updateShoppingCartByApprovedOrder({ customerUUID, orderId: orderId });
                await this.cache.invalidateMultipleQueries([
                    { entity: "customer:orders", query: { orderUUID, customerUUID } },
                    { entity: "customer:shopping-cart", query: { customerUUID } }
                ]);
            } else {
                this.logger.log(`Orden de cliente invitado, omitiendo invalidación de carrito`);
            }
        }

        this.logger.log(`Cache invalidado para orden ${orderUUID}`);
    }
}
