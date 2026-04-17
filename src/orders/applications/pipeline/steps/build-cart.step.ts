import { OrderPipelineStep } from "../interfaces/pipeline-step.interface";
import { OrderContext } from "../order.context";
import { ProductVersionFindService } from "src/product-version/product-version.find.service";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { buildShoppingCart } from "src/orders/orders.helpers";

@Injectable()
export class BuildCartStep implements OrderPipelineStep {
    private readonly logger = new Logger(BuildCartStep.name)
    constructor(
        private readonly productVersionFind: ProductVersionFindService,

    ) { };

    async execute(context: OrderContext): Promise<void> {
        const { orderItems, couponCode } = context;
        if (!orderItems) throw new BadRequestException("Error al crear la orden, no se encuentran los productos a comprar")
        const skuList = orderItems.map((item) => item.sku);
        const pvCards = await this.productVersionFind.searchCards({ filters: { skuList, couponCode }, scope: "internal" }).catch((error) => {
            this.logger.error(error);
            throw new BadRequestException("Error al crear orden de pago")
        });
        if (!pvCards) throw new BadRequestException("Error al obtener las tarjetas de producto")
        const { data } = pvCards;
        const shoppingCart = buildShoppingCart({ productVersionCards: data, orderItems });
        context.pvCards = pvCards.data;
        context.shoppingCart = shoppingCart;
    };
};