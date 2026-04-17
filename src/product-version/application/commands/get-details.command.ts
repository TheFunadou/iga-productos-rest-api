export class GetDetailsCommand {
    constructor(
        public readonly sku: string,
        public readonly customerUUID?: string
    ) {}
}