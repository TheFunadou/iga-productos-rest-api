import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { Resend } from 'resend';
import { ShippingService } from 'src/shipping/shipping.service';
import VerificationTokenEmail from './emails/TokenVerificationEmial';

@Injectable()
export class NotificationsService {
    private readonly resend: Resend;
    private readonly nodeEnv;
    private readonly logger = new Logger(ShippingService.name);
    constructor(
        private readonly config: ConfigService,
    ) {
        const resendApiKey = this.config.get("RESEND_API_KEY");
        if (!resendApiKey) throw new NotFoundException("No se encontro la API key de Resend");
        this.resend = new Resend(resendApiKey);
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async sendTokenEmail({ token, to, type }: { token: string, to: string, type: "verification" | "restore-password" }) {
        const emailHtml = await render(VerificationTokenEmail({ token, type }))
        const { data, error } = await this.resend.emails.send({
            from: 'Iga Productos <no_reply@igaproductos.com>',
            to: [to],
            subject: type === "verification" ? 'Tu código de verificación' : 'Tu código de restablecimiento de contraseña',
            html: emailHtml,
        });

        if (error) this.logger.error("Error al enviar el email");
        if (error && this.nodeEnv === "DEV") {
            this.logger.error(error);
        }
    };

}
