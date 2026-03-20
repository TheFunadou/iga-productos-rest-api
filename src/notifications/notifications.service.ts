import { Injectable } from '@nestjs/common';
import { render } from '@react-email/components';
import VerificationTokenEmail from './emails/TokenVerificationEmial';
import OrderConfirmationEmail from './emails/OrderConfirmationEmail';
import { OrderItem } from './notifications.types';
import { ResendProvider } from './providers/resend.provider';
import { GetPaidOrderDetails } from 'src/orders/payment/payment.dto';
import PaymentConfirmationEmail from './emails/PaymentConfirmationEmail';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly resend: ResendProvider
    ) { };

    async sendTokenEmail({ token, to, type }: { token: string, to: string, type: "verification" | "restore-password" }) {
        const emailHtml = await render(VerificationTokenEmail({ token, type }))
        await this.resend.sendEmail({
            from: 'Iga Productos <no_reply@igaproductos.com>',
            to: [to],
            subject: type === "verification" ? 'Tu código de verificación' : 'Tu código de restablecimiento de contraseña',
            html: emailHtml,
        });
    };

    async sendOrderApproved({ orderUUID, items, total, to }: { orderUUID: string, items: OrderItem[], total: string, to: string }) {
        const emailHtml = await render(OrderConfirmationEmail({ orderUUID, items, total }))
        await this.resend.sendEmail({
            from: "Iga Productos <ventas@igaproductos.com>",
            to: [to],
            subject: "Gracias por tu compra",
            html: emailHtml,
        });
    };

    async sendPaymentApproved({ to, paidOrderDetails }: { to: string, paidOrderDetails: GetPaidOrderDetails }) {
        const emailHtml = await render(PaymentConfirmationEmail({ paidOrderDetails }))
        await this.resend.sendEmail({
            from: "Iga Productos <ventas@igaproductos.com>",
            to: [to],
            subject: "Gracias por tu compra",
            html: emailHtml,
        });
    };

};
