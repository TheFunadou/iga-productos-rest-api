import {
    Html,
    Head,
    Body,
    Container,
    Text,
    Heading,
    Img,
    Section,
    Link,
} from "@react-email/components";
import { GetPaidOrderDetails } from "../../orders/payment/payment.dto";

const baseUrl = "https://igaproductos.com";
const IgaLogo =
    "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";

const colors = {
    navy: "#010230",
    success: "#059669",
    textDark: "#111827",
    textMid: "#374151",
    textLight: "#6b7280",
    textMuted: "#9ca3af",
    border: "#e5e7eb",
    bgPage: "#f4f6f8",
    bgWhite: "#ffffff",
    bgLight: "#f9fafb",
    strikethrough: "#ef4444",
};

function formatCurrency(amount: number | string): string {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(amount));
}

export interface PaymentConfirmationEmailProps {
    paidOrderDetails: GetPaidOrderDetails;
}

export default function PaymentConfirmationEmail({ paidOrderDetails }: PaymentConfirmationEmailProps) {
    if (!paidOrderDetails || !paidOrderDetails.order) return null;

    const { address, items, customer, details } = paidOrderDetails.order;
    const { resume, order } = details;
    const orderUUID = order?.uuid || "N/A";

    return (
        <Html lang="es">
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>{`
                    * { box-sizing: border-box; }
                    body { margin: 0 !important; padding: 0 !important; }
                    table { border-collapse: collapse !important; }
                    img { border: 0; outline: none; text-decoration: none; }
                    @media only screen and (max-width: 620px) {
                        .wrapper { width: 100% !important; }
                        .sec-pad { padding-left: 20px !important; padding-right: 20px !important; }
                        .mobile-stack td { display: block !important; width: 100% !important; padding-left: 0 !important; margin-bottom: 8px; }
                        .cta-btn { padding: 13px 24px !important; font-size: 13px !important; }
                    }
                `}</style>
            </Head>

            <Body style={{ backgroundColor: colors.bgPage, fontFamily: "Helvetica, Arial, sans-serif", margin: "0", padding: "40px 0" }}>
                <Container className="wrapper" style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: colors.bgWhite, borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                    {/* ── HEADER ── */}
                    <Section style={{ backgroundColor: colors.navy, padding: "30px 20px", textAlign: "center" }}>
                        <Link href={baseUrl}>
                            <Img src={IgaLogo} alt="IGA Productos" style={{ width: "180px", margin: "0 auto", display: "block" }} />
                        </Link>
                    </Section>

                    {/* ── SUCCESS HERO ── */}
                    <Section style={{ backgroundColor: colors.navy, padding: "20px 30px 40px", textAlign: "center" }}>
                        <div style={{ display: "inline-block", width: "56px", height: "56px", backgroundColor: colors.success, borderRadius: "50%", lineHeight: "56px", textAlign: "center", fontSize: "26px", color: "#ffffff", marginBottom: "16px" }}>
                            ✓
                        </div>
                        <Heading style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 12px", color: colors.bgWhite }}>
                            ¡Pago Aprobado Exitosamente!
                        </Heading>
                        <Text style={{ fontSize: "15px", color: "rgba(255,255,255,0.70)", margin: "0 auto", lineHeight: "1.7", maxWidth: "420px" }}>
                            Hola {customer?.name}, hemos validado tu pago. Tu pedido ya está en proceso de preparación.
                        </Text>
                    </Section>

                    {/* ── CLIENTE & ORDEN ── */}
                    <Section className="sec-pad" style={{ padding: "30px 30px 20px" }}>
                        <div style={{ padding: "20px", backgroundColor: colors.bgLight, borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                            <Text style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: colors.textMuted, margin: "0 0 6px" }}>Folio de orden</Text>
                            <Text style={{ fontSize: "15px", fontWeight: "700", color: colors.navy, margin: "0 0 16px", fontFamily: "monospace", wordBreak: "break-all" }}>
                                #{orderUUID}
                            </Text>

                            <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "16px" }}>
                                <tr>
                                    <td width="50%" style={{ verticalAlign: "top" }}>
                                        <Text style={{ fontSize: "12px", fontWeight: "700", color: colors.textMuted, margin: "0 0 6px", textTransform: "uppercase" }}>Comprador</Text>
                                        <Text style={{ fontSize: "13px", color: colors.textDark, margin: "0 0 4px", fontWeight: "600" }}>{customer?.name} {customer?.last_name}</Text>
                                        <Text style={{ fontSize: "13px", color: colors.textLight, margin: "0" }}>{customer?.email}</Text>
                                    </td>
                                    <td width="50%" style={{ verticalAlign: "top" }}>
                                        <Text style={{ fontSize: "12px", fontWeight: "700", color: colors.textMuted, margin: "0 0 6px", textTransform: "uppercase" }}>Método / Medio</Text>
                                        <Text style={{ fontSize: "13px", color: colors.textDark, margin: "0 0 4px", fontWeight: "600" }}>{order?.payment_provider === "mercado_pago" ? "Mercado Pago" : "PayPal"}</Text>
                                        <Text style={{ fontSize: "13px", color: colors.textLight, margin: "0" }}>{order?.is_guest_order ? "Invitado" : "Registrado"}</Text>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </Section>

                    {/* ── DIRECCIÓN DE ENVÍO ── */}
                    {address && (
                        <Section className="sec-pad" style={{ padding: "0 30px 20px" }}>
                            <div style={{ padding: "20px", backgroundColor: colors.bgLight, borderRadius: "8px", border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.navy}` }}>
                                <Text style={{ fontSize: "14px", fontWeight: "700", color: colors.navy, margin: "0 0 12px" }}>Información de Envío</Text>
                                <Text style={{ fontSize: "13px", color: colors.textDark, margin: "0 0 8px", lineHeight: "1.5" }}>
                                    <strong style={{ color: colors.textMid }}>Recibe:</strong> {address.recipient_name} {address.recipient_last_name}<br />
                                    <strong style={{ color: colors.textMid }}>Domicilio:</strong> {address.street_name} #{address.number}{address.aditional_number ? ` int. ${address.aditional_number}` : ""}<br />
                                    Col. {address.neighborhood}, {address.city}, {address.state}<br />
                                    C.P. {address.zip_code}, {address.country}<br />
                                    <strong style={{ color: colors.textMid }}>Contacto:</strong> {address.country_phone_code} {address.contact_number}
                                </Text>
                                {address.references_or_comments && (
                                    <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#fffbeb", borderRadius: "6px" }}>
                                        <Text style={{ fontSize: "12px", fontWeight: "600", color: "#d97706", margin: "0 0 4px" }}>Referencias:</Text>
                                        <Text style={{ fontSize: "12px", color: "#92400e", margin: "0" }}>{address.references_or_comments}</Text>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* ── PRODUCTOS ── */}
                    <Section className="sec-pad" style={{ padding: "10px 30px 20px" }}>
                        <Heading style={{ fontSize: "16px", fontWeight: "700", color: colors.textDark, margin: "0 0 16px", borderBottom: `1px solid ${colors.border}`, paddingBottom: "12px" }}>
                            Productos ({items.length})
                        </Heading>

                        {items.map((item: any, index) => {
                            const itemName = item.product_name || item.name || "Producto";
                            const itemQty = item.quantity || item.qty || 1;
                            const images = item.product_images || [];
                            const mainImageObj = images.find((img: any) => img.main_image) || images[0];
                            const imageUrl = mainImageObj?.image_url || "";

                            const price = parseFloat(item.product_version?.unit_price || item.price || 0);
                            const priceDiscount = parseFloat(item.product_version?.unit_price_with_discount || price);
                            const hasDiscount = priceDiscount < price && item.discount && item.discount > 0;
                            const finalPrice = hasDiscount ? priceDiscount : price;
                            const isLast = index === items.length - 1;

                            return (
                                <table className="mobile-stack" key={index} role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ borderBottom: !isLast ? `1px solid ${colors.border}` : "none", paddingBottom: !isLast ? "16px" : "0", marginBottom: !isLast ? "16px" : "0" }}>
                                    <tr>
                                        {imageUrl && (
                                            <td style={{ width: "72px", verticalAlign: "top" }}>
                                                <Img src={imageUrl} alt={itemName} style={{ width: "64px", height: "64px", objectFit: "cover", border: `1px solid ${colors.border}`, borderRadius: "6px", display: "block" }} />
                                            </td>
                                        )}
                                        <td style={{ paddingLeft: imageUrl ? "16px" : "0", verticalAlign: "top" }}>
                                            <Text style={{ fontSize: "14px", fontWeight: "700", color: colors.textDark, margin: "0 0 6px" }}>{itemName}</Text>
                                            <Text style={{ fontSize: "12px", color: colors.textLight, margin: "0" }}>
                                                Cantidad: <strong style={{ color: colors.textMid }}>{itemQty}</strong>
                                                {(item.product_version?.color_name || item.product_version?.sku) && (
                                                    <span> • Color: {item.product_version?.color_name || "N/A"} • SKU: {item.product_version?.sku || "N/A"}</span>
                                                )}
                                            </Text>
                                        </td>
                                        <td style={{ verticalAlign: "top", textAlign: "right" }}>
                                            <Text style={{ fontSize: "14px", fontWeight: "800", color: colors.textDark, margin: "0" }}>{formatCurrency(finalPrice * itemQty)}</Text>
                                            {hasDiscount && (
                                                <Text style={{ fontSize: "11px", color: colors.strikethrough, margin: "2px 0 0", textDecoration: "line-through" }}>{formatCurrency(price * itemQty)}</Text>
                                            )}
                                        </td>
                                    </tr>
                                </table>
                            );
                        })}
                    </Section>

                    {/* ── RESUMEN FINANCIERO ── */}
                    {resume && (
                        <Section className="sec-pad" style={{ padding: "20px 30px", backgroundColor: colors.bgLight, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
                            <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                                <tr>
                                    <td style={{ paddingBottom: "10px", color: colors.textMid, fontSize: "13px" }}>Subtotal</td>
                                    <td style={{ paddingBottom: "10px", textAlign: "right", color: colors.textDark, fontSize: "13px", fontWeight: "600" }}>{formatCurrency(resume.subtotalBeforeIVA)}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingBottom: "10px", color: colors.textMid, fontSize: "13px" }}>I.V.A (16%)</td>
                                    <td style={{ paddingBottom: "10px", textAlign: "right", color: colors.textDark, fontSize: "13px", fontWeight: "600" }}>{formatCurrency(resume.iva)}</td>
                                </tr>
                                {resume.discount > 0 && (
                                    <tr>
                                        <td style={{ paddingBottom: "10px", color: colors.success, fontSize: "13px", fontWeight: "600" }}>Descuentos</td>
                                        <td style={{ paddingBottom: "10px", textAlign: "right", color: colors.success, fontSize: "13px", fontWeight: "600" }}>-{formatCurrency(resume.discount)}</td>
                                    </tr>
                                )}
                                {resume.shippingCost > 0 && (
                                    <tr>
                                        <td style={{ paddingBottom: "12px", color: colors.textMid, fontSize: "13px" }}>Envío ({resume.boxesQty} cajas)</td>
                                        <td style={{ paddingBottom: "12px", textAlign: "right", color: colors.textDark, fontSize: "13px", fontWeight: "600" }}>{formatCurrency(resume.shippingCost)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={{ paddingTop: "12px", borderTop: `1px solid ${colors.border}`, color: colors.navy, fontSize: "16px", fontWeight: "800" }}>Total Pagado</td>
                                    <td style={{ paddingTop: "12px", borderTop: `1px solid ${colors.border}`, textAlign: "right", color: colors.navy, fontSize: "16px", fontWeight: "800" }}>{formatCurrency(resume.total)}</td>
                                </tr>
                            </table>
                        </Section>
                    )}

                    {/* ── CTA ── */}
                    <Section className="sec-pad" style={{ textAlign: "center", padding: "40px 30px" }}>
                        <Link href={`${baseUrl}/mi-cuenta/mis-ordenes`} className="cta-btn" style={{ backgroundColor: colors.navy, color: colors.bgWhite, padding: "14px 32px", fontSize: "14px", fontWeight: "700", borderRadius: "8px", textDecoration: "none", display: "inline-block" }}>
                            Ver mi orden en el Panel →
                        </Link>
                    </Section>

                    {/* ── FOOTER ── */}
                    <Section style={{ borderTop: `1px solid ${colors.border}`, padding: "20px", textAlign: "center" }}>
                        <Text style={{ fontSize: "12px", color: colors.textMuted, margin: "0" }}>
                            © {new Date().getFullYear()} IGA Productos. Todos los derechos reservados.
                        </Text>
                        <Text style={{ fontSize: "12px", color: "#7e848dff", margin: "4px 0 0" }}>
                            Este es un correo automático. Por favor no contestes directamente a este mensaje.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}
