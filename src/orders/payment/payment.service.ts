import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { MercadoPagoConfig, Payment } from "mercadopago";

@Injectable()
export class PaymentService {

    private readonly mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    private readonly mercadoPagoClient: MercadoPagoConfig;
    private readonly mercadoPagoPayment: Payment;

    constructor(
        private readonly ordersService: OrdersService,
    ) {
        this.mercadoPagoClient = new MercadoPagoConfig({ accessToken: this.mercadoPagoAccessToken! });
        this.mercadoPagoPayment = new Payment(this.mercadoPagoClient);
    };

    async getMercadoPagoPaymentInfo(args: { orderId: string }) {
        return await this.mercadoPagoPayment.get({ id: args.orderId }).catch((error) => {
            throw new BadRequestException("Error al obtener la información de la orden de pago");
        });
    };

    async handleMercadoPagoPayment(args: { xx: string }) {

    };
};
