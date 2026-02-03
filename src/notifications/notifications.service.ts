import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { Resend } from 'resend';
import WelcomeEmail from './templates/WelcomeEmail';

@Injectable()
export class NotificationsService {
    private readonly resend: Resend;
    constructor(
        private readonly configService: ConfigService,
    ) {
        const resendApiKey = this.configService.get("RESEND_API_KEY");
        if (!resendApiKey) throw new NotFoundException("No se encontro la API key de Resend");
        this.resend = new Resend(resendApiKey);
    };

    async sendEmail() {
        const emailHtml = await render(WelcomeEmail())
        const { data, error } = await this.resend.emails.send({
            from: 'Acme <onboarding@resend.dev>',
            to: ['joelbaezcz@gmail.com'],
            subject: 'Bienvenido a Iga Productos',
            html: emailHtml,
        });

        if (error) {
            return console.error({ error });
        }

        console.log({ data });
    }

}
