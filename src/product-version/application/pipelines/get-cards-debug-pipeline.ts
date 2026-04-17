import { Inject, Injectable, Logger } from "@nestjs/common";
import { BUILD_CARDS_PIPELINE_STEPS } from "./tokens";
import { BuildCardsPipelineStep } from "./interfaces/pipeline-step.interface";
import { BuildCardsContext } from "./get-cards.context";
import { PipelineDebugEngine } from "./get-cards-pipeline-debug.engine";

/**
 * Pipeline con debugging integrado.
 * Ejecuta los mismos steps que BuildCardsPipeline pero con logging
 * detallado de cada paso y captura de errores.
 *
 * No altera la logica original de ningun step.
 */
@Injectable()
export class DebugBuildCardsPipeline {
    private readonly logger = new Logger("DebugBuildCardsPipeline");

    constructor(
        @Inject(BUILD_CARDS_PIPELINE_STEPS)
        private readonly steps: BuildCardsPipelineStep[],
        private readonly debugEngine: PipelineDebugEngine,
    ) { }

    async execute(context: BuildCardsContext): Promise<void> {
        this.logger.log("╔══════════════════════════════════════════════════════════╗");
        this.logger.log("║  INICIANDO BUILD CARDS PIPELINE (DEBUG MODE)            ║");
        this.logger.log("╚══════════════════════════════════════════════════════════╝");
        this.logger.log(`Scope: ${context.scope}`);
        this.logger.log(`isClient: ${context.isClient}`);
        this.logger.log(`customerUUID: ${context.customerUUID ?? "anonimo"}`);
        this.logger.log(`queryParams: ${JSON.stringify(context.queryParams)}`);
        this.logger.log(`Total steps: ${this.steps.length}`);
        this.logger.log("");

        const pipelineStart = Date.now();
        const errors: Array<{ step: string; error: unknown }> = [];

        for (const step of this.steps) {
            const result = await this.debugEngine.executeStep(step, context);

            if (!result.success) {
                errors.push({
                    step: step.constructor.name,
                    error: result.error,
                });

                // Loguear error critico pero continuar con el siguiente step
                this.logger.error(
                    `⚠ Error en ${step.constructor.name}, continuando con el siguiente step...`
                );
            }

            if (context.stopPipeline) {
                this.logger.warn(
                    `Pipeline detenido despues de ${step.constructor.name}`
                );
                break;
            }
        }

        const pipelineElapsed = Date.now() - pipelineStart;

        this.logger.log("");
        this.logger.log("╔══════════════════════════════════════════════════════════╗");
        this.logger.log("║  PIPELINE FINALIZADO                                    ║");
        this.logger.log("╚══════════════════════════════════════════════════════════╝");
        this.logger.log(`Tiempo total: ${pipelineElapsed}ms`);
        this.logger.log(`Steps ejecutados: ${this.steps.length}`);
        this.logger.log(`Errores: ${errors.length}`);
        this.logger.log(`Cards generadas: ${context.cards?.length ?? 0}`);
        this.logger.log(`totalRecords: ${context.totalRecords ?? 0}`);
        this.logger.log(`totalPages: ${context.totalPages ?? 0}`);

        if (errors.length > 0) {
            this.logger.warn("");
            this.logger.warn("─── ERRORES DETECTADOS ───");
            errors.forEach(({ step, error }) => {
                this.logger.warn(`  • ${step}: ${this.formatError(error)}`);
            });
        }

        // Si hubo errores, lanzar excepcion con el resumen
        if (errors.length > 0) {
            const errorMessages = errors
                .map(({ step, error }) => `${step}: ${this.formatError(error)}`)
                .join("; ");

            throw new Error(
                `BuildCardsPipeline fallo en ${errors.length} step(s): ${errorMessages}`
            );
        }
    }

    private formatError(error: unknown): string {
        if (error instanceof Error) {
            return `${error.name}: ${error.message}`;
        }
        if (typeof error === "string") {
            return error;
        }
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
}
