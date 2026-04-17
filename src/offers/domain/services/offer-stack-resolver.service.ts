import { Injectable } from "@nestjs/common";
import { OfferI, ResolvedOfferI } from "src/product-version/application/pipelines/interfaces/get-cards.interface";

@Injectable()
export class OfferStackResolverService {

    resolve(sku: string, offers: OfferI[]): ResolvedOfferI {
        // Regla 1: Si no hay ofertas
        if (!offers.length) {
            return { sku, applicableOffers: [], finalDiscount: 0, isExclusive: false, stackGroup: "BASE" };
        }

        // Regla 2: Si hay alguna exclusiva → solo la de mayor prioridad, bloquea todo
        const exclusives = offers.filter(o => o.isExclusive);
        if (exclusives.length > 0) {
            const best = this.pickHighestPriority(exclusives);
            return {
                sku,
                applicableOffers: [best],
                finalDiscount: best.discount,
                isExclusive: true,
                stackGroup: best.stackGroup,
            };
        }

        // Regla 3: Agrupar por stackGroup y elegir el mejor de cada grupo
        const groupMap = new Map<string, OfferI[]>();
        for (const offer of offers) {
            const group = offer.stackGroup;
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(offer);
        }

        // De cada grupo, tomar solo la de mayor prioridad (y en empate, mayor descuento)
        const winners: OfferI[] = [];
        for (const [, groupOffers] of groupMap) {
            winners.push(this.pickHighestPriority(groupOffers));
        }

        // Regla 4: Respetar max_stack global (tomamos el más restrictivo del set ganador)
        const maxStack = Math.min(...winners.map(o => o.maxStack));
        const finalOffers = winners
            .sort((a, b) => b.priority - a.priority || b.discount - a.discount)
            .slice(0, maxStack);

        const finalDiscount = finalOffers.reduce((acc, o) => acc + o.discount, 0);

        return {
            sku,
            applicableOffers: finalOffers,
            finalDiscount,
            isExclusive: false,
            stackGroup: finalOffers[0]?.stackGroup ?? "BASE",
        };
    }

    private pickHighestPriority(offers: OfferI[]): OfferI {
        return offers.reduce((best, curr) => {
            if (curr.priority > best.priority) return curr;
            if (curr.priority === best.priority && curr.discount > best.discount) return curr;
            return best;
        });
    }
}
