import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { OrderRequestFormGuestDTO, OrderValidatedCustomerData } from "./order.dto";
import { ProductVersionCard } from "src/product-version/product-version.dto";
import { OrderResume, OrderShoppingCartDTO } from "./payment/payment.dto";

export const IVA_VALUE = 0.16;
export const SHIPPING_BOX_COST_VALUE = 1.00; //Mexican pesos
export const MAX_ITEMS_PER_BOX_VALUE = 10;

export const buildValidatedAuthCustomerData = (args: {
    customerData: {
        name: string,
        last_name: string,
        email: string
        id?: string,
    },
    customerAddressData: {
        zip_code: string,
        street_name: string,
        city: string,
        state: string,
        number: string,
        country: string,
        id?: string
    },
}): OrderValidatedCustomerData => {
    const { customerAddressData, customerData } = args;
    return {
        customer: {
            id: customerData.id,
            name: customerData.name,
            last_name: customerData.last_name,
            email: customerData.email
        },
        customerAddress: {
            id: customerAddressData.id,
            zip_code: customerAddressData.zip_code,
            street_name: customerAddressData.street_name,
            city: customerAddressData.city,
            state: customerAddressData.state,
            number: customerAddressData.number,
            country: customerAddressData.country
        }
    };
};

export const buildValidatedGuestCustomerData = ({ guestForm }: {
    guestForm: OrderRequestFormGuestDTO
}): OrderValidatedCustomerData => {
    return {
        customer: {
            id: undefined,
            name: guestForm.first_name,
            last_name: guestForm.last_name,
            email: guestForm.email
        },
        customerAddress: {
            id: undefined,
            zip_code: guestForm.zip_code,
            street_name: guestForm.street_name,
            city: guestForm.city,
            state: guestForm.state,
            number: guestForm.number,
            country: guestForm.country
        }
    };
};


export const buildShoppingCart = (args: { productVersionCards: ProductVersionCard[], orderItems: OrderShoppingCartDTO[] }): ShoppingCartDTO[] => {
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

export const calcShoppingCartOrderResume = (args: { shoppingCart: ShoppingCartDTO[] }): OrderResume => {
    const onlyCheckedItems = args.shoppingCart.filter((item) => item.isChecked);
    const itemsQty = onlyCheckedItems.reduce((acc, item) => {
        return acc + item.quantity
    }, 0);
    const boxesQty = Math.ceil(itemsQty / MAX_ITEMS_PER_BOX_VALUE);
    const shippingCost = boxesQty * SHIPPING_BOX_COST_VALUE;

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

    const iva = subtotal * IVA_VALUE;
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

