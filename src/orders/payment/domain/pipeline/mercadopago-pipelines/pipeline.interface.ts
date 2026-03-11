
export interface IStep<TContext> {
    execute(context: TContext): Promise<void>;
};

export class MercadoPagoPipeline<TContext> {
    private steps: IStep<TContext>[] = [];

    pipe(step: IStep<TContext>): this {
        this.steps.push(step);
        return this;
    };

    async run(context: TContext): Promise<void> {
        for (const step of this.steps) {
            await step.execute(context);
        }
    }
};