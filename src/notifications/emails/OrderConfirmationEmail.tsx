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
    Hr,
} from "@react-email/components";
import { OrderConfirmationEmailProps } from "../notifications.types";



const baseUrl = "https://igaproductos.com";
const IgaLogo =
    "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";

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
    bgPage: "#f0f2f8",
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
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                    * { box-sizing: border-box; }
                    body { margin: 0 !important; padding: 0 !important; }
                    table { border-collapse: collapse !important; }
                    img { border: 0; outline: none; text-decoration: none; }
                    @media only screen and (max-width: 620px) {
                        .wrapper { width: 100% !important; max-width: 100% !important; }
                        .product-image { width: 80px !important; height: 80px !important; }
                        .product-col-img { width: 90px !important; }
                        .hero-heading { font-size: 20px !important; }
                        .section-pad { padding-left: 16px !important; padding-right: 16px !important; }
                        .cta-btn { padding: 13px 22px !important; font-size: 13px !important; }
                        .total-row { font-size: 16px !important; }
                        .nav-link { font-size: 11px !important; padding: 0 8px !important; }
                    }
                `}</style>
            </Head>
            <Body
                style={{
                    backgroundColor: colors.bgPage,
                    fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
                    margin: "0",
                    padding: "0",
                    WebkitTextSizeAdjust: "100%",
                }}
            >
                {/* Outer wrapper for centering */}
                <table
                    role="presentation"
                    width="100%"
                    cellPadding="0"
                    cellSpacing="0"
                    style={{ backgroundColor: colors.bgPage, padding: "32px 16px" }}
                >
                    <tr>
                        <td align="center">
                            <Container
                                className="wrapper"
                                style={{
                                    maxWidth: "600px",
                                    width: "100%",
                                    backgroundColor: colors.bgWhite,
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                    boxShadow: "0 4px 24px rgba(1,2,48,0.10)",
                                }}
                            >
                                {/* ── HEADER ── */}
                                <Section
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                                        padding: "28px 24px",
                                        textAlign: "center",
                                    }}
                                >
                                    <Link href={baseUrl}>
                                        <Img
                                            src={IgaLogo}
                                            alt="IGA Productos"
                                            style={{ width: "160px", margin: "0 auto", display: "block" }}
                                        />
                                    </Link>
                                </Section>

                                {/* ── NAV LINKS ── */}
                                <Section
                                    style={{
                                        backgroundColor: colors.navyLight,
                                        padding: "10px 24px",
                                        textAlign: "center",
                                    }}
                                >
                                    <Row>
                                        <Column style={{ textAlign: "center" }}>
                                            <Link
                                                href={baseUrl}
                                                className="nav-link"
                                                style={{
                                                    color: "rgba(255,255,255,0.75)",
                                                    fontSize: "12px",
                                                    textDecoration: "none",
                                                    padding: "0 12px",
                                                    borderRight: "1px solid rgba(255,255,255,0.2)",
                                                    fontWeight: "500",
                                                    letterSpacing: "0.02em",
                                                }}
                                            >
                                                IGA Productos
                                            </Link>
                                            <Link
                                                href={`${baseUrl}/mi-cuenta`}
                                                className="nav-link"
                                                style={{
                                                    color: "rgba(255,255,255,0.75)",
                                                    fontSize: "12px",
                                                    textDecoration: "none",
                                                    padding: "0 12px",
                                                    borderRight: "1px solid rgba(255,255,255,0.2)",
                                                    fontWeight: "500",
                                                    letterSpacing: "0.02em",
                                                }}
                                            >
                                                Mi Cuenta
                                            </Link>
                                            <Link
                                                href={`${baseUrl}/mi-cuenta/mis-ordenes`}
                                                className="nav-link"
                                                style={{
                                                    color: colors.accent,
                                                    fontSize: "12px",
                                                    textDecoration: "none",
                                                    padding: "0 12px",
                                                    fontWeight: "600",
                                                    letterSpacing: "0.02em",
                                                }}
                                            >
                                                Mis Órdenes
                                            </Link>
                                        </Column>
                                    </Row>
                                </Section>

                                {/* ── SUCCESS BANNER ── */}
                                <Section
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                                        padding: "36px 32px 40px",
                                        textAlign: "center",
                                        position: "relative",
                                    }}
                                >
                                    {/* Checkmark icon */}
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
                                                    }}
                                                >
                                                    ✓
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                    <Heading
                                        className="hero-heading"
                                        style={{
                                            fontSize: "26px",
                                            fontWeight: "800",
                                            margin: "0 0 10px",
                                            color: colors.bgWhite,
                                            letterSpacing: "-0.02em",
                                            lineHeight: "1.2",
                                        }}
                                    >
                                        ¡Compra confirmada!
                                    </Heading>
                                    <Text
                                        style={{
                                            fontSize: "14px",
                                            color: "rgba(255,255,255,0.70)",
                                            margin: "0 auto",
                                            lineHeight: "1.7",
                                            maxWidth: "400px",
                                        }}
                                    >
                                        Hemos recibido tu pedido correctamente y ya se encuentra en
                                        proceso. Te notificaremos cuando sea enviado.
                                    </Text>
                                </Section>

                                {/* ── ORDER ID ── */}
                                <Section
                                    className="section-pad"
                                    style={{
                                        padding: "24px 32px",
                                        backgroundColor: colors.bgLight,
                                        borderBottom: `1px solid ${colors.border}`,
                                    }}
                                >
                                    <Row>
                                        <Column>
                                            <Text
                                                style={{
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                    letterSpacing: "0.08em",
                                                    textTransform: "uppercase" as const,
                                                    color: colors.textMuted,
                                                    margin: "0 0 4px",
                                                }}
                                            >
                                                Folio de orden
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: "600",
                                                    color: colors.navy,
                                                    margin: "0",
                                                    wordBreak: "break-all" as const,
                                                    fontFamily: "monospace",
                                                    backgroundColor: colors.bgWhite,
                                                    padding: "8px 12px",
                                                    borderRadius: "6px",
                                                    border: `1px solid ${colors.border}`,
                                                    display: "inline-block",
                                                }}
                                            >
                                                #{orderUUID}
                                            </Text>
                                        </Column>
                                    </Row>
                                </Section>

                                {/* ── PRODUCTS HEADER ── */}
                                <Section
                                    className="section-pad"
                                    style={{ padding: "28px 32px 8px" }}
                                >
                                    <Heading
                                        style={{
                                            fontSize: "17px",
                                            fontWeight: "700",
                                            color: colors.textDark,
                                            margin: "0",
                                            letterSpacing: "-0.01em",
                                        }}
                                    >
                                        Resumen de tu compra
                                    </Heading>
                                </Section>

                                {/* ── PRODUCT LIST ── */}
                                <Section
                                    className="section-pad"
                                    style={{ padding: "12px 32px 0" }}
                                >
                                    {items.map((item, index) => {
                                        const hasDiscount = item.discount > 0;
                                        return (
                                            <Section
                                                key={index}
                                                style={{
                                                    paddingBottom: "16px",
                                                    marginBottom: "16px",
                                                    borderBottom:
                                                        index !== items.length - 1
                                                            ? `1px solid ${colors.border}`
                                                            : "none",
                                                }}
                                            >
                                                <Row>
                                                    {/* Image */}
                                                    <Column
                                                        className="product-col-img"
                                                        style={{ width: "100px", verticalAlign: "top" }}
                                                    >
                                                        <Link href={`${baseUrl}/mi-cuenta/mis-ordenes`}>
                                                            <Img
                                                                src={item.image_url}
                                                                alt={item.name}
                                                                className="product-image"
                                                                style={{
                                                                    width: "88px",
                                                                    height: "88px",
                                                                    objectFit: "cover",
                                                                    borderRadius: "10px",
                                                                    border: `1px solid ${colors.border}`,
                                                                    display: "block",
                                                                }}
                                                            />
                                                        </Link>
                                                    </Column>

                                                    {/* Info */}
                                                    <Column
                                                        style={{
                                                            verticalAlign: "top",
                                                            paddingLeft: "12px",
                                                        }}
                                                    >
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
                                                                margin: "0 0 8px",
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
                                                    </Column>
                                                </Row>
                                            </Section>
                                        );
                                    })}
                                </Section>

                                {/* ── ORDER TOTAL ── */}
                                <Section
                                    className="section-pad"
                                    style={{
                                        padding: "20px 32px 24px",
                                        backgroundColor: colors.bgLight,
                                        borderTop: `2px solid ${colors.border}`,
                                        borderBottom: `2px solid ${colors.border}`,
                                    }}
                                >
                                    <Row>
                                        <Column>
                                            <Text
                                                style={{
                                                    fontSize: "13px",
                                                    color: colors.textLight,
                                                    margin: "0 0 2px",
                                                    fontWeight: "500",
                                                }}
                                            >
                                                {totalItems} {totalItems === 1 ? "producto" : "productos"} en total
                                            </Text>
                                        </Column>
                                        <Column style={{ textAlign: "right" }}>
                                            <Text
                                                className="total-row"
                                                style={{
                                                    fontSize: "18px",
                                                    fontWeight: "800",
                                                    color: colors.navy,
                                                    margin: "0",
                                                    letterSpacing: "-0.02em",
                                                }}
                                            >
                                                Total: {total}
                                            </Text>
                                        </Column>
                                    </Row>
                                </Section>

                                {/* ── CTA ── */}
                                <Section
                                    className="section-pad"
                                    style={{ textAlign: "center", padding: "32px 32px 36px" }}
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
                                            background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
                                            color: colors.bgWhite,
                                            padding: "14px 32px",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            borderRadius: "8px",
                                            textDecoration: "none",
                                            display: "inline-block",
                                            letterSpacing: "0.01em",
                                        }}
                                    >
                                        Ver mis órdenes →
                                    </Link>
                                </Section>

                                {/* ── FOOTER ── */}
                                <Section
                                    style={{
                                        backgroundColor: colors.navy,
                                        padding: "24px 32px",
                                        textAlign: "center",
                                    }}
                                >
                                    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                                        <tr>
                                            <td align="center" style={{ paddingBottom: "14px" }}>
                                                <Link
                                                    href={baseUrl}
                                                    style={{
                                                        color: "rgba(255,255,255,0.6)",
                                                        fontSize: "12px",
                                                        textDecoration: "none",
                                                        padding: "0 10px",
                                                        borderRight: "1px solid rgba(255,255,255,0.2)",
                                                    }}
                                                >
                                                    IGA Productos
                                                </Link>
                                                <Link
                                                    href={`${baseUrl}/mi-cuenta`}
                                                    style={{
                                                        color: "rgba(255,255,255,0.6)",
                                                        fontSize: "12px",
                                                        textDecoration: "none",
                                                        padding: "0 10px",
                                                        borderRight: "1px solid rgba(255,255,255,0.2)",
                                                    }}
                                                >
                                                    Mi Cuenta
                                                </Link>
                                                <Link
                                                    href={`${baseUrl}/mi-cuenta/mis-ordenes`}
                                                    style={{
                                                        color: "rgba(255,255,255,0.6)",
                                                        fontSize: "12px",
                                                        textDecoration: "none",
                                                        padding: "0 10px",
                                                    }}
                                                >
                                                    Mis Órdenes
                                                </Link>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <Text
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "rgba(255,255,255,0.35)",
                                                        margin: "0",
                                                        lineHeight: "1.6",
                                                    }}
                                                >
                                                    © {new Date().getFullYear()} IGA Productos. Todos los derechos reservados.
                                                </Text>
                                            </td>
                                        </tr>
                                    </table>
                                </Section>
                            </Container>
                        </td>
                    </tr>
                </table>
            </Body>
        </Html>
    );
}