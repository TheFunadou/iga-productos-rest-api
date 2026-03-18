import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class ResendProvider {
    private readonly resend: Resend;
    private readonly logger = new Logger(ResendProvider.name);
    constructor(private readonly config: ConfigService) {
        const resendApiKey = this.config.get("RESEND_API_KEY");
        if (!resendApiKey) throw new NotFoundException("No se encontro la API KEY de Resend");
        this.resend = new Resend(resendApiKey);
    };

    /**
     * Send an email to the specified recipients.
     * @param args - The email arguments.
     * @param args.to - The recipients of the email.
     * @param args.subject - The subject of the email.
     * @param args.html - The HTML content of the email.
     * @param args.from - The sender of the email.
     * 
     * @example
     * ```typescript
     * await this.resend.sendEmail({
     *  from: "Iga Productos <[EMAIL_ADDRESS]>",
     *  to: ["[EMAIL_ADDRESS]"],
     *  subject: "Test",
     *  html: "<h1>Test</h1>",
     * });
     * ```
     */
    async sendEmail(args: { to: string[], subject: string, html: string, from: string }) {
        const { to, subject, html, from } = args;
        const { error } = await this.resend.emails.send({
            from,
            to,
            subject,
            html,
        });
        if (error) {
            this.logger.error("Ocurrio un error al enviar el email");
            this.logger.error(error);
        }
    }

};