import { Injectable } from '@nestjs/common';
import { render } from '@react-email/components';
import VerificationTokenEmail from './emails/TokenVerificationEmial';
import { ResendProvider } from './providers/resend.provider';
import PaymentConfirmationEmail from './emails/PaymentConfirmationEmail';
import { PaymentDetailsI } from 'src/orders/payment/domain/interfaces/payment.interfaces';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly resend: ResendProvider
    ) { };

    async sendTokenEmail({ token, to, type }: { token: string, to: string, type: "verification" | "restore-password" }) {
        const emailHtml = await render(VerificationTokenEmail({ token, type }))
        await this.resend.sendEmail({
            payload: {
                from: 'Iga Productos <no_reply@igaproductos.com>',
                to: [to],
                subject: type === "verification" ? 'Tu código de verificación' : 'Tu código de restablecimiento de contraseña',
                html: emailHtml,
            }
        });
    };

    async sendPaymentApproved({ to, data }: { to: string, data: PaymentDetailsI }) {
        const html = await render(PaymentConfirmationEmail({ data }))
        await this.resend.sendEmail({
            payload: {
                from: "Iga Productos <no_reply@igaproductos.com>",
                to: [to],
                cc: "direcciongeneral@igaproductos.com.mx",
                subject: "Gracias por tu compra!!",
                html
            }
        });
    };

};
