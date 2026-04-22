import { ShoppingCartDTO } from "src/customer/shopping-cart/shopping-cart.dto";
import { OrderRequestFormGuestDTO, OrderValidatedCustomerData } from "./payment/application/DTO/order.dto";
import { OrderResume } from "./payment/payment.dto";
import { IVA, SHIPPING_COST, MAX_ITEMS_PER_BOX } from "./helpers/order.helpers";
import { OrderCheckoutItemI, PrismaOrderItemI } from "./applications/pipeline/interfaces/order.interface";


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


export const calcShoppingCartOrderResume = (args: { shoppingCart: ShoppingCartDTO[] }): OrderResume => {
    const onlyCheckedItems = args.shoppingCart.filter((item) => item.isChecked);
    const itemsQty = onlyCheckedItems.reduce((acc, item) => {
        return acc + item.quantity
    }, 0);
    const boxesQty = Math.ceil(itemsQty / MAX_ITEMS_PER_BOX);
    const shippingCost = boxesQty * SHIPPING_COST;

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

    const iva = subtotal * IVA;
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

export const toOrderCheckoutItemI = ({ data }: { data: PrismaOrderItemI[] }): OrderCheckoutItemI[] => {
    return data.map((items) => ({
        name: items.product_version.product.product_name,
        category: items.product_version.product.category.name,
        subcategories: items.product_version.product.subcategories.map(sub => ({ uuid: sub.subcategories.uuid, name: sub.subcategories.description })),
        sku: items.product_version.sku,
        color: {
            line: items.product_version.color_line,
            name: items.product_version.color_name,
            code: items.product_version.color_code,
        },
        unitPrice: items.unit_price.toString(),
        finalPrice: items.final_price.toString(),
        quantity: items.quantity,
        offer: {
            isOffer: items.isOffer,
            discount: items.discount,
        },
        subtotal: items.subtotal.toString(),
        images: items.product_version.product_version_images.map((image) => ({
            url: image.image_url,
            mainImage: image.main_image,
        })),
    }))
};
