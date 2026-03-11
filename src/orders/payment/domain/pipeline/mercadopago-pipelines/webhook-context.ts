export class MercadoPagoWebhookContext {
    public readonly xSignature: string;
    public readonly xRequestId: string;
    public readonly dataId: string;
    public readonly type: string;
    public shouldStop: boolean = false;

    constructor(args: {
        xSignature: string;
        xRequestId: string;
        dataId: string;
        type: string;
    }) {
        Object.assign(this, args);
    };
};