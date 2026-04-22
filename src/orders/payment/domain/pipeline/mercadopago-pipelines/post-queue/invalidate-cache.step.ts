import { Logger, NotFoundException } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";
import { OrderProcessingStatus } from "src/orders/payment/payment.interfaces";
import { ShoppingCartService } from "src/customer/shopping-cart/domain/services/shopping-cart.service";
import { PrismaService } from "src/prisma/prisma.service";

export class InvalidateCacheStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(InvalidateCacheStep.name);

    constructor(
        private readonly cache: CacheService,
        private readonly shoppingCart: ShoppingCartService,
        private readonly prisma: PrismaService
    ) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        if (context.skipped || !["APPROVED", "PENDING"].includes(context.orderStatus!)) return;
        const { orderUUID, customerUUID, orderId, orderStatus, orderItems, isGuest } = context;
        if (!orderUUID) throw new NotFoundException("No se encontro el UUID de la orden");
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
        await Promise.all([
            await this.cache.invalidateQuery({
                entity: "client:payment:details",
                query: { orderUUID }
            }),
            await this.cache.invalidateQuery({
                entity: "customer:order:payment-details",
                query: { orderUUID }
            })
        ]);

        if (orderStatus === "APPROVED" && orderId && orderItems) {

            if (customerUUID) {
                this.logger.log(`Procesando invalidación de cache para cliente autenticado ${customerUUID}`);
                await Promise.all([
                    await this.shoppingCart.updateShoppingCartByApprovedOrder({ customerUUID, orderItems }),
                    await this.cache.invalidateQuery({
                        entity: "customer:orders", query: { orderUUID, customerUUID }
                    })
                ])
            } else if (isGuest && !customerUUID) {
                this.logger.log(`Procesando invalidación de cache para cliente invitado`);
                const order = await this.prisma.order.findUnique({
                    where: { uuid: orderUUID },
                    select: { session_id: true }
                });

                if (!order) throw new NotFoundException("No se encontro la orden");
                if (!order.session_id) throw new NotFoundException("No se encontro el ID de sesion de la orden");
                await this.shoppingCart.updateShoppingCartByApprovedOrder({ sessionId: order.session_id, orderItems });
            };
        };

        this.logger.log(`Cache invalidado para orden ${orderUUID}`);
    }
}
