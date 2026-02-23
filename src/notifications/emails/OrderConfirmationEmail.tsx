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

interface OrderItem {
    name: string;
    qty: number;
    image_url: string;
}

interface OrderConfirmationEmailProps {
    orderUUID: string;
    items: OrderItem[];
}

export default function OrderConfirmationEmail({
    orderUUID,
    items,
}: OrderConfirmationEmailProps) {
    const IgaLogo =
        "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";

    const ordersUrl =
        "https://igaproductos.com/mi-cuenta/mis-ordenes";

    return (
        <Html>
            <Head />
            <Body
                style={{
                    backgroundColor: "#f3f4f6",
                    fontFamily: "Helvetica, Arial, sans-serif",
                    margin: 0,
                    padding: "40px 0",
                }}
            >
                <Container
                    style={{
                        maxWidth: "600px",
                        margin: "0 auto",
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        overflow: "hidden",
                    }}
                >
                    {/* HEADER */}
                    <Section
                        style={{
                            backgroundColor: "#010230",
                            padding: "30px 20px",
                            textAlign: "center",
                        }}
                    >
                        <Img
                            src={IgaLogo}
                            alt="IGA Productos"
                            style={{ width: "180px", margin: "0 auto" }}
                        />
                    </Section>

                    {/* HERO */}
                    <Section style={{ padding: "40px 30px 20px 30px" }}>
                        <Heading
                            style={{
                                fontSize: "24px",
                                margin: "0 0 12px 0",
                                color: "#111827",
                                textAlign: "center",
                            }}
                        >
                            Compra confirmada
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                color: "#6b7280",
                                textAlign: "center",
                                lineHeight: "1.6",
                            }}
                        >
                            Hemos recibido tu pedido correctamente y ya se encuentra en
                            proceso. Te notificaremos cuando sea enviado.
                        </Text>
                    </Section>

                    {/* ORDER INFO */}
                    <Section
                        style={{
                            margin: "0 30px 30px 30px",
                            padding: "10px",
                            borderRadius: "6px",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                marginBottom: "6px",
                            }}
                        >
                            Folio de orden
                        </Text>

                        <Text
                            style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#111827",
                                margin: 0,
                                wordBreak: "break-all",
                            }}
                        >
                            {orderUUID}
                        </Text>
                    </Section>

                    {/* PRODUCTS */}
                    <Section style={{ padding: "0 30px 10px 30px" }}>
                        <Heading
                            style={{
                                fontSize: "18px",
                                marginBottom: "20px",
                                color: "#111827",
                            }}
                        >
                            Resumen de tu compra
                        </Heading>

                        {items.map((item, index) => (
                            <Section
                                key={index}
                                style={{
                                    paddingBottom: "20px",
                                    marginBottom: "20px",
                                    borderBottom:
                                        index !== items.length - 1
                                            ? "1px solid #e5e7eb"
                                            : "none",
                                }}
                            >
                                <Row>
                                    <Column style={{ width: "110px" }}>
                                        <Link href={ordersUrl}>
                                            <Img
                                                src={item.image_url}
                                                alt={item.name}
                                                style={{
                                                    width: "100px",
                                                    height: "100px",
                                                    objectFit: "cover",
                                                    borderRadius: "6px",
                                                }}
                                            />
                                        </Link>
                                    </Column>

                                    <Column style={{ paddingLeft: "10px" }}>
                                        <Text
                                            style={{
                                                fontSize: "15px",
                                                fontWeight: "600",
                                                margin: "0 0 6px 0",
                                                color: "#111827",
                                            }}
                                        >
                                            {item.name}
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: "14px",
                                                color: "#6b7280",
                                                margin: 0,
                                            }}
                                        >
                                            Cantidad: {item.qty}
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>
                        ))}
                    </Section>

                    {/* CTA */}
                    <Section style={{ textAlign: "center", padding: "10px 30px 40px" }}>
                        <Text
                            style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                marginBottom: "20px",
                                lineHeight: "1.6",
                            }}
                        >
                            Puedes consultar el estado de envío, descargar tu factura y
                            revisar todos los detalles desde tu panel de cliente.
                        </Text>

                        <Link
                            href={ordersUrl}
                            style={{
                                backgroundColor: "#010230",
                                color: "#ffffff",
                                padding: "14px 28px",
                                fontSize: "14px",
                                fontWeight: "600",
                                borderRadius: "6px",
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            Ir a Mis Órdenes
                        </Link>
                    </Section>

                    {/* FOOTER */}
                    <Section
                        style={{
                            borderTop: "1px solid #e5e7eb",
                            padding: "20px",
                            textAlign: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: "12px",
                                color: "#9ca3af",
                                margin: 0,
                            }}
                        >
                            © {new Date().getFullYear()} IGA Productos. Todos los derechos reservados.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}