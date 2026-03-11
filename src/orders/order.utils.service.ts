import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductVersionCard } from "src/product-version/product-version.dto";
import { AddItemsToOrderOrderItems } from "./order.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { OrderResume, OrderShoppingCartDTO } from "./payment/payment.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class OrderUtilsService {
    private readonly IVA = 0.16;
    private readonly SHIPPING_BOX_COST = 1.00; //Mexican pesos
    private readonly MAX_ITEMS_PER_BOX = 10;
    constructor(
        private readonly prisma: PrismaService
    ) { };


    buildShoppingCart(args: { productVersionCards: ProductVersionCard[], orderItems: OrderShoppingCartDTO[] }): ShoppingCartDTO[] {
        return args.productVersionCards.map((card: ProductVersionCard) => ({
            product_name: card.product_name,
            category: card.category,
            subcategories: card.subcategories,
            product_version: {
                sku: card.product_version.sku,
                color_code: card.product_version.color_code,
                color_line: card.product_version.color_line,
                color_name: card.product_version.color_name,
                stock: card.product_version.stock,
                unit_price: card.product_version.unit_price,
                unit_price_with_discount: card.product_version.unit_price_with_discount
            },
            product_images: card.product_images,
            isChecked: true,
            quantity: args.orderItems.find((cart) => cart.product === card.product_version.sku)?.quantity!,
            isOffer: card.isOffer,
            discount: card.discount,
            isFavorite: card.isFavorite
        }));
    };

    // buildMercadoPagoPreferenceBodyAuthCustomer(args: {
    //     internalOrderId: string,
    //     items: MercadoPagoItems[],
    //     vigency: { expirationFrom: string, expirationTo: string },
    //     customer: CustomerAttributes,
    //     customerAddress: CreateCustomerAddressDTO,
    //     shippingCost: number,
    // }): PreferenceCreateData {
    //     return {
    //         body: {
    //             items: args.items,
    //             payer: {
    //                 email: args.customer.email,
    //                 name: args.customer.name,
    //                 surname: args.customer.last_name,
    //             },
    //             back_urls: {
    //                 success: new URL("pagar-productos/pago-exitoso", this.FRONTEND_URL).href,
    //                 failure: new URL("pagar-productos/pago-fallido", this.FRONTEND_URL).href,
    //                 pending: new URL("pagar-productos/pago-pendiente", this.FRONTEND_URL).href
    //             },
    //             shipments: {
    //                 cost: args.shippingCost,
    //                 receiver_address: {
    //                     zip_code: args.customerAddress.zip_code,
    //                     street_name: args.customerAddress.street_name,
    //                     city_name: args.customerAddress.city,
    //                     state_name: args.customerAddress.state,
    //                     street_number: args.customerAddress.number,
    //                     country_name: args.customerAddress.country,
    //                 },
    //             },
    //             additional_info: "Información adicional",
    //             auto_return: "all",
    //             marketplace: "IGA PRODUCTOS",
    //             expires: true,
    //             expiration_date_from: args.vigency.expirationFrom,
    //             expiration_date_to: args.vigency.expirationTo,
    //             notification_url: this.MERCADO_PAGO_NOTIFICATION_URL ?? "https://captious-brazenly-gladys.ngrok-free.dev/payment/mercadopago/webhook",
    //             external_reference: args.internalOrderId,
    //         }
    //     };
    // };

    // buildMercadoPagoPreferenceBodyGuestCustomer(args: {
    //     internalOrderId: string,
    //     items: MercadoPagoItems[],
    //     vigency: { expirationFrom: string, expirationTo: string },
    //     guestForm: OrderRequestFormGuestDTO,
    //     shippingCost: number,
    // }): PreferenceCreateData {
    //     return {
    //         body: {
    //             items: args.items,
    //             payer: {
    //                 email: args.guestForm.email,
    //                 name: args.guestForm.first_name,
    //                 surname: args.guestForm.last_name,
    //             },
    //             back_urls: {
    //                 success: new URL("pagar-productos/invitado/pago-exitoso", this.FRONTEND_URL).href,
    //                 failure: new URL("pagar-productos/invitado/pago-fallido", this.FRONTEND_URL).href,
    //                 pending: new URL("pagar-productos/invitado/pago-pendiente", this.FRONTEND_URL).href
    //             },
    //             shipments: {
    //                 cost: args.shippingCost,
    //                 receiver_address: {
    //                     zip_code: args.guestForm.zip_code,
    //                     street_name: args.guestForm.street_name,
    //                     city_name: args.guestForm.city,
    //                     state_name: args.guestForm.state,
    //                     street_number: args.guestForm.number,
    //                     country_name: args.guestForm.country,
    //                 },
    //             },
    //             additional_info: "Información adicional",
    //             auto_return: "all",
    //             marketplace: "IGA PRODUCTOS",
    //             expires: true,
    //             expiration_date_from: args.vigency.expirationFrom,
    //             expiration_date_to: args.vigency.expirationTo,
    //             notification_url: this.MERCADO_PAGO_NOTIFICATION_URL ?? "https://captious-brazenly-gladys.ngrok-free.dev/payment/mercadopago/webhook",
    //             external_reference: args.internalOrderId,
    //         }
    //     };
    // };

    calcOrderResume(args: { shoppingCart: ShoppingCartDTO[] }): OrderResume {
        const onlyCheckedItems = args.shoppingCart.filter((item) => item.isChecked);
        const itemsQty = onlyCheckedItems.reduce((acc, item) => {
            return acc + item.quantity
        }, 0);
        const boxesQty = Math.ceil(itemsQty / this.MAX_ITEMS_PER_BOX);
        const shippingCost = boxesQty * this.SHIPPING_BOX_COST;

        const subtotal = onlyCheckedItems.reduce((acc, item) => {
            const itemTotal = parseFloat(item.product_version.unit_price.toString()) * item.quantity;
            return acc + itemTotal;
        }, 0);

        const discount = onlyCheckedItems.reduce((acc, item) => {
            if (item.isOffer && item.product_version.unit_price_with_discount) {
                return acc + (parseFloat(item.product_version.unit_price.toString()) - parseFloat(item.product_version.unit_price_with_discount)) * item.quantity;
            } else {
                return acc;
            }
        }, 0);

        const iva = subtotal * this.IVA;
        const subtotalBeforeIVA = subtotal - iva;
        const subtotalWithDiscount = subtotal - discount;
        const total = subtotalWithDiscount + shippingCost;

        const response: OrderResume = {
            boxesQty,
            shippingCost,
            subtotalBeforeIVA,
            subtotalWithDiscount,
            discount,
            iva,
            total
        };

        return response;
    };

    async buildAddItemsToOrder(args: {
        pvCards: ProductVersionCard[],
        shoppingCart: ShoppingCartDTO[],
        orderId: string,
    }): Promise<AddItemsToOrderOrderItems[]> {
        const { pvCards, shoppingCart, orderId } = args;
        const orderItems: AddItemsToOrderOrderItems[] = [];
        for (const item of pvCards) {
            const shoppingCartItem = shoppingCart.find((cart) => cart.product_version.sku === item.product_version.sku);
            if (shoppingCartItem) {
                const findItem = await this.prisma.productVersion.findUnique({ where: { sku: shoppingCartItem.product_version.sku }, select: { id: true } });
                if (!findItem) throw new NotFoundException("Ocurrio un error al procesar la orden de pago");
                orderItems.push({
                    order_id: orderId,
                    product_version_id: findItem.id,
                    quantity: shoppingCartItem.quantity,
                    unit_price: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) : parseFloat(item.product_version.unit_price!.toString()),
                    discount: shoppingCartItem.discount,
                    subtotal: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) * shoppingCartItem.quantity : parseFloat(item.product_version.unit_price!.toString()) * shoppingCartItem.quantity,
                });
            }
        }
        return orderItems;
    };




};