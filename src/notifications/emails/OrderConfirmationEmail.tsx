import {
    Html,
    Head,
    Body,
    Container,
    Text,
    Heading,
    Img,
    Section,
    Row,
    Column,
    Link,
} from "@react-email/components";
import { OrderConfirmationEmailProps } from "../notifications.types";

const baseUrl = "https://igaproductos.com";
const IgaLogo =
    "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";

// ── Design tokens (unified with VerificationTokenEmail) ──────────────────────
const colors = {
    navy: "#010230",
    navyLight: "#0a1a6b",
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    success: "#059669",
    successBg: "#d1fae5",
    textDark: "#111827",
    textMid: "#374151",
    textLight: "#6b7280",
    textMuted: "#9ca3af",
    border: "#e5e7eb",
    bgPage: "#f4f6f8",   // matches VerificationTokenEmail
    bgWhite: "#ffffff",
    bgLight: "#f9fafb",
    strikethrough: "#ef4444",
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(amount);
}

export default function OrderConfirmationEmail({
    orderUUID,
    items,
    total,
}: OrderConfirmationEmailProps) {
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

    return (
        <Html lang="es">
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>{`
                    * { box-sizing: border-box; }
                    body { margin: 0 !important; padding: 0 !important; }
                    table { border-collapse: collapse !important; }
                    img { border: 0; outline: none; text-decoration: none; }

                    /* ── Responsive ── */
                    @media only screen and (max-width: 620px) {
                        .wrapper  { width: 100% !important; }
                        .sec-pad  { padding-left: 20px !important; padding-right: 20px !important; }
                        .hero-title { font-size: 22px !important; }
                        .product-img { width: 72px !important; height: 72px !important; }
                        .product-col-img { width: 84px !important; }
                        .total-amount { font-size: 16px !important; }
                        .cta-btn  { padding: 13px 24px !important; font-size: 13px !important; }
                        .nav-item { font-size: 11px !important; padding: 0 8px !important; }
                    }
                `}</style>
            </Head>

            {/* ── PAGE BACKGROUND ─────────────────────────────────────────── */}
            <Body
                style={{
                    backgroundColor: colors.bgPage,
                    fontFamily: "Helvetica, Arial, sans-serif",
                    margin: "0",
                    padding: "40px 0",
                    WebkitTextSizeAdjust: "100%",
                }}
            >
                <Container
                    className="wrapper"
                    style={{
                        maxWidth: "600px",
                        margin: "0 auto",
                        backgroundColor: colors.bgWhite,
                        borderRadius: "8px",          // same as VerificationTokenEmail
                        overflow: "hidden",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)", // same as VerificationTokenEmail
                    }}
                >

                    {/* ── HEADER ──────────────────────────────────────────── */}
                    <Section
                        style={{
                            backgroundColor: colors.navy,
                            padding: "30px 20px",
                            textAlign: "center",
                        }}
                    >
                        <Link href={baseUrl}>
                            <Img
                                src={IgaLogo}
                                alt="IGA Productos"
                                style={{ width: "180px", margin: "0 auto", display: "block" }}
                            />
                        </Link>
                    </Section>

                    {/* ── NAV LINKS ───────────────────────────────────────── */}
                    <Section
                        style={{
                            backgroundColor: colors.navyLight,
                            padding: "10px 24px",
                            textAlign: "center",
                        }}
                    >
                        <Link
                            href={baseUrl}
                            className="nav-item"
                            style={{
                                color: "rgba(255,255,255,0.75)",
                                fontSize: "12px",
                                textDecoration: "none",
                                padding: "0 12px",
                                borderRight: "1px solid rgba(255,255,255,0.20)",
                                fontWeight: "500",
                            }}
                        >
                            IGA Productos
                        </Link>
                        <Link
                            href={`${baseUrl}/mi-cuenta`}
                            className="nav-item"
                            style={{
                                color: "rgba(255,255,255,0.75)",
                                fontSize: "12px",
                                textDecoration: "none",
                                padding: "0 12px",
                                borderRight: "1px solid rgba(255,255,255,0.20)",
                                fontWeight: "500",
                            }}
                        >
                            Mi Cuenta
                        </Link>
                        <Link
                            href={`${baseUrl}/mi-cuenta/mis-ordenes`}
                            className="nav-item"
                            style={{
                                color: colors.accent,
                                fontSize: "12px",
                                textDecoration: "none",
                                padding: "0 12px",
                                fontWeight: "600",
                            }}
                        >
                            Mis Órdenes
                        </Link>
                    </Section>

                    {/* ── SUCCESS HERO ────────────────────────────────────── */}
                    {/*
                     *  Kept on the navy background to match the screenshot,
                     *  but uses the same simple solid color as VerificationTokenEmail
                     *  (no gradient) for visual consistency.
                     */}
                    <Section
                        style={{
                            backgroundColor: colors.navy,
                            padding: "40px 30px 20px",   // same vertical rhythm as VerificationTokenEmail hero
                            textAlign: "center",
                        }}
                    >
                        {/* Checkmark circle */}
                        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                            <tr>
                                <td align="center" style={{ paddingBottom: "16px" }}>
                                    <div
                                        style={{
                                            display: "inline-block",
                                            width: "56px",
                                            height: "56px",
                                            backgroundColor: colors.success,
                                            borderRadius: "50%",
                                            lineHeight: "56px",
                                            textAlign: "center",
                                            fontSize: "26px",
                                            color: "#ffffff",
                                        }}
                                    >
                                        ✓
                                    </div>
                                </td>
                            </tr>
                        </table>

                        <Heading
                            className="hero-title"
                            style={{
                                fontSize: "24px",
                                fontWeight: "800",
                                margin: "0 0 12px",
                                color: colors.bgWhite,
                                letterSpacing: "-0.01em",
                                lineHeight: "1.2",
                            }}
                        >
                            ¡Compra confirmada!
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                color: "rgba(255,255,255,0.70)",
                                margin: "0 auto 0",
                                lineHeight: "1.7",
                                maxWidth: "420px",
                            }}
                        >
                            Hemos recibido tu pedido correctamente y ya se encuentra en
                            proceso. Te notificaremos cuando sea enviado.
                        </Text>
                    </Section>

                    {/* ── ORDER ID ────────────────────────────────────────── */}
                    {/*
                     *  Uses the same "token block" treatment as VerificationTokenEmail:
                     *  light grey card, border, monospace text in navy.
                     */}
                    <Section
                        className="sec-pad"
                        style={{
                            padding: "30px 30px 20px",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase" as const,
                                color: colors.textMuted,
                                margin: "0 0 8px",
                                textAlign: "center",
                            }}
                        >
                            Folio de orden
                        </Text>

                        {/* Token-style block ── same as VerificationTokenEmail */}
                        <div
                            style={{
                                padding: "16px 20px",
                                backgroundColor: colors.bgLight,
                                borderRadius: "8px",
                                textAlign: "center",
                                border: `1px solid ${colors.border}`,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    letterSpacing: "1px",
                                    color: colors.navy,
                                    margin: "0",
                                    fontFamily: "monospace",
                                    wordBreak: "break-all" as const,
                                }}
                            >
                                #{orderUUID}
                            </Text>
                        </div>
                    </Section>

                    {/* ── PRODUCTS HEADER ─────────────────────────────────── */}
                    <Section
                        className="sec-pad"
                        style={{ padding: "8px 30px 12px" }}
                    >
                        <Heading
                            style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: colors.textDark,
                                margin: "0",
                            }}
                        >
                            Resumen de tu compra
                        </Heading>
                    </Section>

                    {/* ── PRODUCT LIST ────────────────────────────────────── */}
                    <Section
                        className="sec-pad"
                        style={{ padding: "0 30px" }}
                    >
                        {items.map((item, index) => {
                            const hasDiscount = item.discount > 0;
                            const isLast = index === items.length - 1;

                            return (
                                <table
                                    key={index}
                                    role="presentation"
                                    width="100%"
                                    cellPadding="0"
                                    cellSpacing="0"
                                    style={{
                                        borderBottom: !isLast ? `1px solid ${colors.border}` : "none",
                                        paddingBottom: !isLast ? "20px" : "0",
                                        marginBottom: !isLast ? "20px" : "0",
                                    }}
                                >
                                    <tr>
                                        {/* Product image */}
                                        <td
                                            className="product-col-img"
                                            style={{ width: "96px", verticalAlign: "top" }}
                                        >
                                            <Link href={`${baseUrl}/mi-cuenta/mis-ordenes`}>
                                                <Img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="product-img"
                                                    style={{
                                                        width: "88px",
                                                        height: "88px",
                                                        objectFit: "cover",
                                                        borderRadius: "8px",
                                                        border: `1px solid ${colors.border}`,
                                                        display: "block",
                                                    }}
                                                />
                                            </Link>
                                        </td>

                                        {/* Product details */}
                                        <td style={{ verticalAlign: "top", paddingLeft: "16px" }}>
                                            {/* Name */}
                                            <Text
                                                style={{
                                                    fontSize: "14px",
                                                    fontWeight: "700",
                                                    color: colors.textDark,
                                                    margin: "0 0 6px",
                                                    lineHeight: "1.4",
                                                }}
                                            >
                                                {item.name}
                                            </Text>

                                            {/* Qty badge */}
                                            <Text
                                                style={{
                                                    fontSize: "12px",
                                                    color: colors.textLight,
                                                    margin: "0 0 10px",
                                                    fontWeight: "500",
                                                }}
                                            >
                                                Cantidad:{" "}
                                                <span
                                                    style={{
                                                        backgroundColor: colors.bgLight,
                                                        border: `1px solid ${colors.border}`,
                                                        borderRadius: "4px",
                                                        padding: "1px 7px",
                                                        fontWeight: "700",
                                                        color: colors.textMid,
                                                    }}
                                                >
                                                    {item.qty}
                                                </span>
                                            </Text>

                                            {/* Pricing */}
                                            {hasDiscount ? (
                                                <table role="presentation" cellPadding="0" cellSpacing="0">
                                                    <tr>
                                                        <td style={{ paddingRight: "8px", verticalAlign: "middle" }}>
                                                            <Text
                                                                style={{
                                                                    fontSize: "12px",
                                                                    color: colors.strikethrough,
                                                                    margin: "0",
                                                                    textDecoration: "line-through",
                                                                    fontWeight: "500",
                                                                }}
                                                            >
                                                                {formatCurrency(item.price)}
                                                            </Text>
                                                        </td>
                                                        <td style={{ paddingRight: "8px", verticalAlign: "middle" }}>
                                                            <span
                                                                style={{
                                                                    backgroundColor: colors.accentLight,
                                                                    color: "#92400e",
                                                                    fontSize: "11px",
                                                                    fontWeight: "700",
                                                                    padding: "2px 7px",
                                                                    borderRadius: "20px",
                                                                    whiteSpace: "nowrap" as const,
                                                                }}
                                                            >
                                                                -{item.discount}%
                                                            </span>
                                                        </td>
                                                        <td style={{ verticalAlign: "middle" }}>
                                                            <Text
                                                                style={{
                                                                    fontSize: "15px",
                                                                    fontWeight: "800",
                                                                    color: colors.success,
                                                                    margin: "0",
                                                                }}
                                                            >
                                                                {formatCurrency(item.finalPrice)}
                                                            </Text>
                                                        </td>
                                                    </tr>
                                                </table>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontSize: "15px",
                                                        fontWeight: "800",
                                                        color: colors.textDark,
                                                        margin: "0",
                                                    }}
                                                >
                                                    {formatCurrency(item.finalPrice)}
                                                </Text>
                                            )}
                                        </td>
                                    </tr>
                                </table>
                            );
                        })}
                    </Section>

                    {/* ── ORDER TOTAL ─────────────────────────────────────── */}
                    <Section
                        className="sec-pad"
                        style={{
                            padding: "20px 30px",
                            backgroundColor: colors.bgLight,
                            borderTop: `1px solid ${colors.border}`,
                            borderBottom: `1px solid ${colors.border}`,
                            marginTop: "20px",
                        }}
                    >
                        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                            <tr>
                                <td>
                                    <Text
                                        style={{
                                            fontSize: "13px",
                                            color: colors.textLight,
                                            margin: "0",
                                            fontWeight: "500",
                                        }}
                                    >
                                        {totalItems} {totalItems === 1 ? "producto" : "productos"} en total
                                    </Text>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                    <Text
                                        className="total-amount"
                                        style={{
                                            fontSize: "18px",
                                            fontWeight: "800",
                                            color: colors.navy,
                                            margin: "0",
                                            letterSpacing: "-0.01em",
                                        }}
                                    >
                                        Total: {total}
                                    </Text>
                                </td>
                            </tr>
                        </table>
                    </Section>

                    {/* ── CTA ─────────────────────────────────────────────── */}
                    {/*
                     *  Same centre-aligned structure as VerificationTokenEmail's
                     *  info text block, followed by a single primary CTA.
                     */}
                    <Section
                        className="sec-pad"
                        style={{
                            textAlign: "center",
                            padding: "40px 30px",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: "14px",
                                color: colors.textLight,
                                margin: "0 0 24px",
                                lineHeight: "1.7",
                            }}
                        >
                            Puedes consultar el estado de envío, descargar tu factura y
                            revisar todos los detalles desde tu panel de cliente.
                        </Text>

                        <Link
                            href={`${baseUrl}/mi-cuenta/mis-ordenes`}
                            className="cta-btn"
                            style={{
                                backgroundColor: colors.navy,
                                color: colors.bgWhite,
                                padding: "14px 32px",
                                fontSize: "14px",
                                fontWeight: "700",
                                borderRadius: "8px",
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            Ver mis órdenes →
                        </Link>
                    </Section>

                    {/* ── FOOTER ──────────────────────────────────────────── */}
                    {/* Mirrors VerificationTokenEmail footer exactly */}
                    <Section
                        style={{
                            borderTop: `1px solid ${colors.border}`,
                            padding: "20px",
                            textAlign: "center",
                        }}
                    >
                        {/* Nav links */}
                        <Text style={{ margin: "0 0 8px" }}>
                            <Link
                                href={baseUrl}
                                style={{
                                    color: colors.textMuted,
                                    fontSize: "12px",
                                    textDecoration: "none",
                                    padding: "0 10px",
                                    borderRight: `1px solid ${colors.border}`,
                                }}
                            >
                                IGA Productos
                            </Link>
                            <Link
                                href={`${baseUrl}/mi-cuenta`}
                                style={{
                                    color: colors.textMuted,
                                    fontSize: "12px",
                                    textDecoration: "none",
                                    padding: "0 10px",
                                    borderRight: `1px solid ${colors.border}`,
                                }}
                            >
                                Mi Cuenta
                            </Link>
                            <Link
                                href={`${baseUrl}/mi-cuenta/mis-ordenes`}
                                style={{
                                    color: colors.textMuted,
                                    fontSize: "12px",
                                    textDecoration: "none",
                                    padding: "0 10px",
                                }}
                            >
                                Mis Órdenes
                            </Link>
                        </Text>

                        <Text
                            style={{
                                fontSize: "12px",
                                color: colors.textMuted,
                                margin: "0",
                            }}
                        >
                            © {new Date().getFullYear()} IGA Productos. Todos los derechos reservados.
                        </Text>
                        <Text
                            style={{
                                fontSize: "12px",
                                color: "#7e848dff",
                                margin: "4px 0 0",
                            }}
                        >
                            No es necesario contestar este correo.
                        </Text>
                    </Section>

                </Container>
            </Body>
        </Html>
    );
}