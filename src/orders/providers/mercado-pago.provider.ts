import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { PreferenceResponse } from "mercadopago/dist/clients/preference/commonTypes";
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { createHmac, timingSafeEqual } from "crypto";

@Injectable()
export class MercadoPagoProvider {
    private readonly nodeEnv: string;
    private readonly logger = new Logger(MercadoPagoProvider.name);
    private readonly client: MercadoPagoConfig;
    private readonly preference: Preference;
    private readonly payment: Payment;
    private readonly mercadoPagoWebhookSecret?: string;
    private readonly mercadoPagoAccessToken: string;

    constructor(private readonly config: ConfigService) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
        const accessToken = this.nodeEnv === "production" || this.nodeEnv === "testing" ? this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN") : this.config.get<string>("MERCADO_PAGO_ACCESS_TOKEN_TEST");
        if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN no configurado");
        this.mercadoPagoAccessToken = accessToken;
        this.mercadoPagoWebhookSecret = this.config.get<string>("MERCADO_PAGO_WEBHOOK_SECRET");
        if (!this.mercadoPagoWebhookSecret) throw new Error("MERCADO_PAGO_WEBHOOK_SECRET no configurado");
        this.client = new MercadoPagoConfig({ accessToken });
        this.payment = new Payment(this.client);
        this.preference = new Preference(this.client);
    }

    async create(body: PreferenceCreateData): Promise<PreferenceResponse> {
        return this.preference.create(body).then((response) => {
            if (this.nodeEnv !== "production") {
                this.logger.log("Firmado con AccessToken: ", this.mercadoPagoAccessToken)
                this.logger.log("Preferencia creada: ", response);
            }
            return response;
        }).catch((error) => {
            this.logger.error(`Error al crear la preferencia: ${error}`);
            throw new BadRequestException("Ocurrio un error al crear la preferencia");
        });
    };

    async getPaymentDetails({ paymentId }: { paymentId: string }): Promise<PaymentResponse> {
        try {
            const response = await this.payment.get({ id: paymentId });
            return response;
        } catch (error) {
            this.logger.error(`Error al obtener la información del pago: ${paymentId}, ${error}`);
            throw new BadRequestException("Ocurrio un error al procesar el pago");
        };
    };


    /**
         * Verify the signature of the MercadoPago webhook using HMAC-SHA256.
         * Throws UnauthorizedException if the signature is invalid.
         * @see https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/payment-notifications
        */
    verifyWebhookSignature(args: {
        xSignature: string;
        xRequestId: string;
        dataId: string;
    }): void {
        const { xSignature, xRequestId, dataId } = args;

        if (!this.mercadoPagoWebhookSecret) {
            this.logger.error('MERCADO_PAGO_WEBHOOK_SECRET no está configurado');
            throw new UnauthorizedException('Webhook secret no configurado');
        }

        // Extraer ts y v1 del header x-signature
        // Formato: "ts=<timestamp>,v1=<hash>"
        const parts = xSignature.split(',');
        let ts: string | undefined;
        let v1: string | undefined;

        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key?.trim() === 'ts') ts = value?.trim();
            if (key?.trim() === 'v1') v1 = value?.trim();
        }

        if (!ts || !v1) {
            throw new UnauthorizedException('Formato de x-signature inválido');
        }

        // Construir el template según la documentación oficial de MercadoPago
        const signedTemplate = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

        // Generar HMAC-SHA256
        const generatedHash = createHmac('sha256', this.mercadoPagoWebhookSecret)
            .update(signedTemplate)
            .digest('hex');

        // Comparación segura en tiempo constante para evitar timing attacks
        const hashBuffer = Buffer.from(generatedHash, 'hex');
        const v1Buffer = Buffer.from(v1, 'hex');

        if (
            hashBuffer.length !== v1Buffer.length ||
            !timingSafeEqual(hashBuffer, v1Buffer)
        ) {
            this.logger.warn(`Firma de webhook inválida para dataId: ${dataId}`);
            throw new UnauthorizedException('Firma del webhook inválida');
        }

        this.logger.log(`Webhook verificado correctamente para dataId: ${dataId}`);
    };


};