import { Injectable } from "@nestjs/common";
import { OrderPipelineStepI } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";

@Injectable()
export class ReserveDiscountStep implements OrderPipelineStepI {

    async execute(context: OrderContext): Promise<void> {
        const { orderShoppingCart, tx } = context;

        // Si no hay carrito construido o ningún item tiene oferta, no hay nada que reservar
        if (!orderShoppingCart || orderShoppingCart.length === 0) return;

        const itemsWithOffer = orderShoppingCart.filter(
            i => i.offer.isOffer && i.offer.offerIds.length > 0
        );
        if (!itemsWithOffer.length) return;

        // 1 línea de orden con oferta = 1 uso, independientemente de la cantidad de piezas.
        // Si varios items comparten la misma oferta, cada línea cuenta como un uso separado.
        const usageMap = new Map<string, number>();
        for (const item of itemsWithOffer) {
            for (const offerId of item.offer.offerIds) {
                usageMap.set(offerId, (usageMap.get(offerId) ?? 0) + 1);
            }
        }

        const reservations: { offerId: string; incrementedBy: number }[] = [];

        for (const [offerId, incrementedBy] of usageMap) {
            await tx.offers.update({
                where: { id: offerId },
                data: { current_uses: { increment: incrementedBy } }
            });
            reservations.push({ offerId, incrementedBy });
        }

        // Persiste en contexto para que ReleaseDiscountSaga pueda compensar
        // en caso de que el pipeline falle después de este step
        context.reservedOfferUsages = reservations;
    }
}
