import { Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { MercadoPagoPaymentContext } from "../payment-context";
import { IStep } from "../pipeline.interface";

export class SendNotificationStep implements IStep<MercadoPagoPaymentContext> {
    private readonly logger = new Logger(SendNotificationStep.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) { }

    async execute(context: MercadoPagoPaymentContext): Promise<void> {
        // Solo envía notificación si la orden fue APPROVED
        if (context.orderStatus !== "APPROVED" || context.skipped) return;
        if (!context.orderId || !context.payment) throw new Error("SendNotificationStep: orderId o payment no disponible en contexto");

        const orderForEmail = await this.prisma.order.findUnique({
            where: { id: context.orderId },
            include: {
                customer: { select: { email: true } },
                order_items: {
                    include: {
                        product_version: {
                            include: {
                                product: { select: { product_name: true } },
                                product_version_images: {
                                    where: { main_image: true },
                                    select: { image_url: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!orderForEmail) return;

        const emailTo = orderForEmail.customer?.email || context.payment.payer?.email;
        if (!emailTo) return;

        const items = orderForEmail.order_items.map(item => ({
            name: item.product_version.product.product_name,
            qty: item.quantity,
            image_url: item.product_version.product_version_images[0]?.image_url || "",
            price: Number(item.unit_price) * item.quantity,
            discount: item.discount,
            finalPrice: Number(item.subtotal)
        }));

        const total = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })
            .format(Number(orderForEmail.total_amount));

        // Fire-and-forget: no bloquear el pipeline si el email falla
        this.notifications.sendOrderApproved({
            orderUUID: orderForEmail.uuid,
            items,
            total,
            to: emailTo as string,
        }).catch((err) => {
            this.logger.error(`Error enviando email de orden aprobada ${orderForEmail.uuid}: ${err}`);
        });
    }
}
