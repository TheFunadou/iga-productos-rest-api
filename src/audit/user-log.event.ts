export class UserLogEvent {
    constructor(
        public readonly entity: string,
        public readonly entityId: string,
        public readonly action: string,
        public readonly metadata?: any,
        public readonly userId?: string | null,
    ) { };
}