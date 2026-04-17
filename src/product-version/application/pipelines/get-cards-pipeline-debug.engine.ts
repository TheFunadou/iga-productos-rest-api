import { Injectable, Logger } from "@nestjs/common";
import { BuildCardsPipelineStep } from "./interfaces/pipeline-step.interface";
import { BuildCardsContext } from "./get-cards.context";

/**
 * Motor de debugging para el pipeline de BuildCards.
 * Envuelve cada step con logging detallado de:
 *  - Inicio/fin de ejecucion
 *  - Tiempo de ejecucion
 *  - Estado del contexto antes y despues
 *  - Errores con stack trace
 */
@Injectable()
export class PipelineDebugEngine {
    private readonly logger = new Logger("PipelineDebugEngine");

    /**
     * Ejecuta un step del pipeline con debugging completo.
     * Captura y loguea cualquier error sin interrumpir el flujo.
     */
    async executeStep(
        step: BuildCardsPipelineStep,
        context: BuildCardsContext
    ): Promise<{ success: boolean; error?: unknown }> {
        const stepName = step.constructor.name;

        this.logSeparator(stepName);
        this.logger.log(`▶ EJECUTANDO: ${stepName}`);
        this.logSeparator(stepName);

        // Snapshot del contexto antes del step
        this.logContextSnapshot("ANTES", context, stepName);

        const startTime = Date.now();

        try {
            await step.execute(context);
            const elapsed = Date.now() - startTime;

            // Snapshot del contexto despues del step
            this.logContextSnapshot("DESPUES", context, stepName);

            this.logger.log(
                `✅ ${stepName} completado en ${elapsed}ms`
            );

            if (context.stopPipeline) {
                this.logger.warn(
                    `⏹ ${stepName} senalo stopPipeline=true — el pipeline se detendra`
                );
            }

            this.logSeparator(stepName, "end");

            return { success: true };
        } catch (error) {
            const elapsed = Date.now() - startTime;

            this.logger.error(
                `❌ ${stepName} FALLO despues de ${elapsed}ms`
            );
            this.logger.error(`   Error: ${this.formatError(error)}`);

            if (error instanceof Error && error.stack) {
                this.logger.error(`   Stack:\n${error.stack}`);
            }

            this.logContextSnapshot("EN ERROR", context, stepName);
            this.logSeparator(stepName, "end");

            return { success: false, error };
        }
    }

    /**
     * Loguea un resumen del estado del contexto.
     * Solo imprime las keys relevantes para no saturar la consola.
     */
    private logContextSnapshot(
        moment: "ANTES" | "DESPUES" | "EN ERROR",
        context: BuildCardsContext,
        stepName: string
    ): void {
        const ctxSummary: Record<string, unknown> = {
            productsList_len: context.productsList?.length ?? "undefined",
            productEntity_len: context.productEntity?.length ?? "undefined",
            productVersionEntity_len:
                context.productVersionEntity?.length ?? "undefined",
            productVersionStockEntity_len:
                context.productVersionStockEntity?.length ?? "undefined",
            productVersionUnitPriceEntity_len:
                context.productVersionUnitPriceEntity?.length ?? "undefined",
            offerEntity_len: context.offerEntity?.length ?? "undefined",
            productVersionOfferMap_size:
                context.productVersionOfferMap?.size ?? "undefined",
            customerFavorites_len: context.customerFavorites?.length ?? "undefined",
            cards_len: context.cards?.length ?? "undefined",
            stopPipeline: context.stopPipeline,
            totalPages: context.totalPages,
            totalRecords: context.totalRecords,
            where_defined: context.where !== undefined,
            orderBy_defined: context.orderBy !== undefined,
        };

        this.logger.debug(
            `   [${moment}] Contexto ${stepName}: ${JSON.stringify(ctxSummary, null, 2)
                .split("\n")
                .join("\n   ")}`
        );
    }

    private logSeparator(stepName: string, type: "start" | "end" = "start"): void {
        const char = type === "start" ? "═" : "─";
        this.logger.debug(char.repeat(60));
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
