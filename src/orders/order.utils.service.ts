import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductVersionFindService } from "src/product-version/product-version.find.service";
import { Items as MercadoPagoItems } from "mercadopago/dist/clients/commonTypes";
import { ProductVersionCard } from "src/product-version/product-version.dto";
import { OrderRequestDTO, OrderRequestGuestDTO } from "./order.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { Customer, CustomerAttributes } from "src/customer/customer.dto";
import { CreateCustomerAddressDTO, CustomerAddress } from "src/customer/customer-addresses/customer-addresses.dto";
import { OrderResume, OrderShoppingCartDTO } from "./payment/payment.dto";


@Injectable()
export class OrderUtilsService {
    private readonly IVA = 0.16;
    private readonly FRONTEND_URL = process.env.FRONTEND_URL;
    private readonly MERCADO_PAGO_NOTIFICATION_URL = process.env.MERCADO_PAGO_NOTIFICATION_URL;
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly productVersionFindService: ProductVersionFindService
    ) { };


    buildMercadoPagoOrderItems(args: { items: ProductVersionCard[], shoppingCart: OrderShoppingCartDTO[] }): MercadoPagoItems[] {
        return args.items.map((item) => ({
            id: item.product_version.sku,
            title: item.product_name,
            description: item.subcategories.join(","),
            picture_url: item.product_images[0].image_url,
            category_id: item.category,
            quantity: args.shoppingCart.find(qty => qty.product === item.product_version.sku)?.quantity!,
            currency_id: "MXN",
            unit_price: item.isOffer ? parseFloat(item.product_version.unit_price_with_discount!.toString()) : parseFloat(item.product_version.unit_price!.toString())
        }));
    };

    buildMercadoPagoPaymentVigency() {
        const date = new Date();
        const VIGENCY_DAYS = 5;
        const expirationFrom = date.toISOString();
        const calculateVigency = date.getTime() + VIGENCY_DAYS * 24 * 60 * 60 * 1000;
        const expirationTo = new Date(calculateVigency).toISOString();
        return { expirationFrom, expirationTo };
    };


    buildShoppingCart(args: { productVersionCards: ProductVersionCard[], orderRequest: OrderRequestDTO | OrderRequestGuestDTO }): ShoppingCartDTO[] {
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
            quantity: args.orderRequest.shopping_cart.find((cart) => cart.product === card.product_version.sku)?.quantity!,
            isOffer: card.isOffer,
            discount: card.discount,
            isFavorite: card.isFavorite
        }));
    };

    buildMercadoPagoPreferenceBodyAuthCustomer(args: {
        internalOrderId: string,
        items: MercadoPagoItems[],
        shoppingCart: ShoppingCartDTO[],
        vigency: { expirationFrom: string, expirationTo: string },
        customer: CustomerAttributes,
        customerAddress: CreateCustomerAddressDTO,
        shippingCost: number,
    }): PreferenceCreateData {
        return {
            body: {
                items: args.items,
                payer: {
                    email: args.customer.email,
                    name: args.customer.name,
                    surname: args.customer.last_name,
                },
                back_urls: {
                    success: new URL("pagar-productos/pago-exitoso", this.FRONTEND_URL).href,
                    failure: new URL("pagar-productos/pago-fallido", this.FRONTEND_URL).href,
                    pending: new URL("pagar-productos/pago-pendiente", this.FRONTEND_URL).href
                },
                shipments: {
                    cost: args.shippingCost,
                    receiver_address: {
                        zip_code: args.customerAddress.zip_code,
                        street_name: args.customerAddress.street_name,
                        city_name: args.customerAddress.city,
                        state_name: args.customerAddress.state,
                        street_number: args.customerAddress.number,
                        country_name: args.customerAddress.country,
                    },
                },
                additional_info: "Información adicional",
                auto_return: "all",
                marketplace: "IGA PRODUCTOS",
                expires: true,
                expiration_date_from: args.vigency.expirationFrom,
                expiration_date_to: args.vigency.expirationTo,
                notification_url: this.MERCADO_PAGO_NOTIFICATION_URL ?? "https://captious-brazenly-gladys.ngrok-free.dev/payment/mercado-pago/webhook",
                external_reference: args.internalOrderId,
            }
        };
    };

    // calcShippingCost(args: { shoppingCart: ShoppingCartDTO[] }): { boxesQty: number, shippingCost: number } {
    //     const onlyCheckedItems = args.shoppingCart.filter((item) => item.isChecked);
    //     const itemsQty = onlyCheckedItems.reduce((acc, item) => {
    //         return acc + item.quantity
    //     }, 0);
    //     const BOX_COST = 264.00;
    //     const MAX_ITEMS_PER_BOX = 10;
    //     const boxesQty = Math.ceil(itemsQty / MAX_ITEMS_PER_BOX);
    //     const shippingCost = boxesQty * BOX_COST;
    //     return { boxesQty, shippingCost };
    // };

    calcOrderResume(args: { shoppingCart: ShoppingCartDTO[] }): OrderResume {
        const onlyCheckedItems = args.shoppingCart.filter((item) => item.isChecked);
        const itemsQty = onlyCheckedItems.reduce((acc, item) => {
            return acc + item.quantity
        }, 0);
        const BOX_COST = 264.00;
        const MAX_ITEMS_PER_BOX = 10;
        const boxesQty = Math.ceil(itemsQty / MAX_ITEMS_PER_BOX);
        const shippingCost = boxesQty * BOX_COST;

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
        return { boxesQty, shippingCost, subtotalBeforeIVA, subtotalWithDiscount, discount, iva, total };
    };


};