import { ShoppingCartItemsResumeI, ShoppingCartResumeI } from "src/customer/shopping-cart/application/interfaces/shopping-cart.interface";

export const SHIPPING_COST = 264.00; // IVA incluido
export const IVA = 0.16;
export const MAX_ITEMS_PER_BOX = 10;

export const calcResume = ({ items }: { items: ShoppingCartItemsResumeI[] }): ShoppingCartResumeI => {
    const IVA_DIVISOR = 1 + IVA;

    // =============================
    // 1. TOTALES BRUTOS (CON IVA)
    // =============================
    const grossItemsSubtotal = items.reduce(
        (acc, item) => acc + item.quantity * Number(item.unitPrice),
        0
    );

    const grossItemsDiscountedSubtotal = items.reduce(
        (acc, item) => acc + item.quantity * Number(item.finalPrice),
        0
    );

    // =============================
    // 2. ENVÍO (CON IVA)
    // =============================
    const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const boxesCount = Math.ceil(totalItemsCount / MAX_ITEMS_PER_BOX);
    const grossShipping = boxesCount * SHIPPING_COST;

    // =============================
    // 3. NETOS (SIN IVA)
    // =============================
    const netItems = grossItemsSubtotal / IVA_DIVISOR;
    const netItemsDiscounted = grossItemsDiscountedSubtotal / IVA_DIVISOR;
    const netShipping = grossShipping / IVA_DIVISOR;

    // =============================
    // 4. IVA DESGLOSADO (CORRECTO)
    // =============================
    const itemsIVA = grossItemsDiscountedSubtotal - netItemsDiscounted;
    const shippingIVA = grossShipping - netShipping;
    const totalIVA = itemsIVA + shippingIVA;

    // =============================
    // 5. DESCUENTO REAL (SIN IVA)
    // =============================
    const netDiscount = items.reduce((acc, item) => {
        if (!item.isOffer) return acc;

        const unitDiff = Number(item.unitPrice) - Number(item.finalPrice);
        const grossDiscount = unitDiff * item.quantity;

        return acc + (grossDiscount / IVA_DIVISOR);
    }, 0);

    // =============================
    // 6. SUBTOTAL (SIN IVA)
    // =============================
    const subtotal = netItems + netShipping;

    // =============================
    // 7. TOTAL FINAL (CON IVA)
    // =============================
    const total = grossItemsDiscountedSubtotal + grossShipping;

    // =============================
    // 8. FORMAT
    // =============================
    const format = (val: number) =>
        val.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    return {
        itemsSubtotal: format(grossItemsSubtotal), // con IVA
        itemsSubtotalBeforeTaxes: format(netItems), // sin IVA
        shippingCost: format(grossShipping),
        shippingCostBeforeTaxes: format(netShipping),
        boxesCount,
        iva: format(totalIVA),
        subtotal: format(subtotal), // sin IVA
        discount: format(netDiscount), // sin IVA
        total: format(total) // con IVA
    };
};