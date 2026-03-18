
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
            const stepName = step.constructor.name;

            if ("conditionalLog" in (context as any)) {
                (context as any).conditionalLog(`Ejecutando paso: ${stepName}`);
            };

            try {
                await step.execute(context);
            } catch (error) {
                if ("conditionalError" in (context as any)) {
                    (context as any).conditionalError(`Error en paso ${stepName}:`, error);
                }
                throw error;
            }
        }
    }
};