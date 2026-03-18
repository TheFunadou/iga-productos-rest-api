import { Logger } from "@nestjs/common";

export class MercadoPagoWebhookContext {
    private readonly logger = new Logger("MercadoPagoWebhook");
    public readonly xSignature: string;
    public readonly xRequestId: string;
    public readonly dataId: string;
    public readonly type: string;
    public readonly nodeEnv: string;
    public shouldStop: boolean = false;

    constructor(args: {
        xSignature: string;
        xRequestId: string;
        dataId: string;
        type: string;
        nodeEnv: string;
    }) {
        Object.assign(this, args);
        this.nodeEnv = args.nodeEnv;
    };

    conditionalLog(message: string) {
        if (this.nodeEnv === "DEV" || this.nodeEnv === "testing") {
            this.logger.log(`[MERCADOPAGO WEBHOOK] ${message}`);
        }
    };

    conditionalError(message: string, error?: any) {
        if (this.nodeEnv === "DEV" || this.nodeEnv === "testing") {
            this.logger.error(`[MERCADOPAGO WEBHOOK] ${message}`, error);
        }
    };
};