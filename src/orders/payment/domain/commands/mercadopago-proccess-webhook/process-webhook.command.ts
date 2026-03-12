

export class MercadoPagoProcessWebhookCommand {
    constructor(
        public readonly xSignature: string,
        public readonly xRequestId: string,
        public readonly dataId: string,
        public readonly type: string,
        public readonly nodeEnv: string
    ) { }
}