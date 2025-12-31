import { Injectable } from "@nestjs/common";
import { CacheService } from "src/cache/cache.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductVersionFindService } from "src/product-version/product-version.find.service";
import { PaymentShoppingCartDTO } from "./payment/payment.dto";
import { Items as MercadoPagoItems } from "mercadopago/dist/clients/commonTypes";
import { ProductVersionCard } from "src/product-version/product-version.dto";
import { OrderRequestDTO, OrderRequestGuestDTO } from "./order.dto";
import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { Customer, CustomerAttributes } from "src/customer/customer.dto";
import { CreateCustomerAddressDTO, CustomerAddress } from "src/customer/customer-addresses/customer-addresses.dto";


@Injectable()
export class OrderUtilsService {

    private readonly FRONTEND_URL = process.env.FRONTEND_URL;
    private readonly MERCADO_PAGO_NOTIFICATION_URL = process.env.MERCADO_PAGO_NOTIFICATION_URL;
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
        private readonly productVersionFindService: ProductVersionFindService
    ) { };


    buildMercadoPagoOrderItems(args: { items: any, shoppingCart: PaymentShoppingCartDTO[] }): MercadoPagoItems[] {
        return args.items.map((item: any) => ({
            id: item.id.toString(),
            title: item.product.product_name,
            description: item.product.product_attributes.map(attr => attr.category_attribute.description).join(","),
            picture_url: item.product_images[0].image_url,
            category_id: item.product.category.name,
            quantity: args.shoppingCart.find(qty => qty.product === item.sku)?.quantity,
            currency_id: "MXN",
            unit_price: parseFloat(item.unit_price.toString())
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
            },
            product_images: card.product_images,
            isChecked: true,
            quantity: args.orderRequest.shopping_cart.find((cart) => cart.product === card.product_version.sku)?.quantity!,
        }));
    };

    buildMercadoPagoPreferenceBodyAuthCustomer(args: {
        internalOrderId: string,
        items: MercadoPagoItems[],
        shoppingCart: ShoppingCartDTO[],
        vigency: { expirationFrom: string, expirationTo: string },
        customer: CustomerAttributes,
        customerAddress: CreateCustomerAddressDTO,
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


};