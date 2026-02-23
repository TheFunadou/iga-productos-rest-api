import {
    Html,
    Head,
    Body,
    Container,
    Text,
    Heading,
    Img,
    Row,
    Column,
    Section,
    Link,
} from "@react-email/components";

export default function WelcomeEmail() {
    const IgaLogo =
        "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";
    const helmet =
        "https://igaproductos.com.mx/wp-content/uploads/2024/07/hit_intervalo_amarillo-e1722380739491.jpg";
    const barboquejo =
        "https://igaproductos.com.mx/wp-content/uploads/2025/10/007-300x300.jpg";
    const suspension =
        "https://igaproductos.com.mx/wp-content/uploads/2024/06/WhatsApp-Image-2024-07-04-at-5.46.15-PM-2-300x300.jpeg";
    const glasses =
        "https://igaproductos.com.mx/wp-content/uploads/2024/07/MEDICA_P_01-1.jpg";

    const host = "https://igaproductos.com";

    return (
        <Html>
            <Head />
            <Body
                style={{
                    backgroundColor: "#f4f6f8",
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
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
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
                                fontSize: "26px",
                                margin: "0 0 10px 0",
                                color: "#111827",
                                textAlign: "center",
                            }}
                        >
                            Bienvenido a IGA Productos
                        </Heading>

                        <Text
                            style={{
                                fontSize: "16px",
                                color: "#6b7280",
                                textAlign: "center",
                                lineHeight: "1.6",
                                marginBottom: "25px",
                            }}
                        >
                            Gracias por confiar en nosotros. En IGA Productos trabajamos para
                            ofrecerte equipos de protección industrial con los más altos
                            estándares de calidad y seguridad.
                        </Text>
                    </Section>

                    {/* PRODUCT GRID */}
                    <Section style={{ padding: "10px 30px 30px 30px" }}>
                        <Text
                            style={{
                                fontSize: "18px",
                                fontWeight: "600",
                                marginBottom: "20px",
                                textAlign: "center",
                                color: "#111827",
                            }}
                        >
                            Explora nuestras principales categorías
                        </Text>

                        <Row>
                            <Column style={{ padding: "10px", textAlign: "center" }}>
                                <Link href={`${host}/tienda?category=cascos`}>
                                    <Img
                                        src={helmet}
                                        alt="Cascos"
                                        style={{
                                            width: "100%",
                                            maxWidth: "130px",
                                            height: "130px",
                                            objectFit: "cover",
                                            borderRadius: "6px",
                                            margin: "0 auto 10px",
                                            display: "block",
                                        }}
                                    />
                                </Link>
                                <Link
                                    href={`${host}/tienda?category=cascos`}
                                    style={{
                                        fontSize: "14px",
                                        color: "#010230",
                                        fontWeight: "600",
                                        textDecoration: "none",
                                    }}
                                >
                                    Cascos
                                </Link>
                            </Column>

                            <Column style={{ padding: "10px", textAlign: "center" }}>
                                <Link href={`${host}/tienda?category=barboquejos`}>
                                    <Img
                                        src={barboquejo}
                                        alt="Barboquejos"
                                        style={{
                                            width: "100%",
                                            maxWidth: "130px",
                                            height: "130px",
                                            objectFit: "cover",
                                            borderRadius: "6px",
                                            margin: "0 auto 10px",
                                            display: "block",
                                        }}
                                    />
                                </Link>
                                <Link
                                    href={`${host}/tienda?category=barboquejos`}
                                    style={{
                                        fontSize: "14px",
                                        color: "#010230",
                                        fontWeight: "600",
                                        textDecoration: "none",
                                    }}
                                >
                                    Barboquejos
                                </Link>
                            </Column>
                        </Row>

                        <Row>
                            <Column style={{ padding: "10px", textAlign: "center" }}>
                                <Link href={`${host}/tienda?category=suspensiones`}>
                                    <Img
                                        src={suspension}
                                        alt="Suspensiones"
                                        style={{
                                            width: "100%",
                                            maxWidth: "130px",
                                            height: "130px",
                                            objectFit: "cover",
                                            borderRadius: "6px",
                                            margin: "0 auto 10px",
                                            display: "block",
                                        }}
                                    />
                                </Link>
                                <Link
                                    href={`${host}/tienda?category=suspensiones`}
                                    style={{
                                        fontSize: "14px",
                                        color: "#010230",
                                        fontWeight: "600",
                                        textDecoration: "none",
                                    }}
                                >
                                    Suspensiones
                                </Link>
                            </Column>

                            <Column style={{ padding: "10px", textAlign: "center" }}>
                                <Link href={`${host}/tienda?category=lentes`}>
                                    <Img
                                        src={glasses}
                                        alt="Lentes de seguridad"
                                        style={{
                                            width: "100%",
                                            maxWidth: "130px",
                                            height: "130px",
                                            objectFit: "cover",
                                            borderRadius: "6px",
                                            margin: "0 auto 10px",
                                            display: "block",
                                        }}
                                    />
                                </Link>
                                <Link
                                    href={`${host}/tienda?category=lentes`}
                                    style={{
                                        fontSize: "14px",
                                        color: "#010230",
                                        fontWeight: "600",
                                        textDecoration: "none",
                                    }}
                                >
                                    Lentes de Seguridad
                                </Link>
                            </Column>
                        </Row>
                    </Section>

                    {/* CTA */}
                    <Section style={{ textAlign: "center", padding: "10px 30px 40px" }}>
                        <Link
                            href={host}
                            style={{
                                backgroundColor: "#010230",
                                color: "#ffffff",
                                padding: "14px 28px",
                                fontSize: "15px",
                                fontWeight: "600",
                                borderRadius: "6px",
                                textDecoration: "none",
                                display: "inline-block",
                            }}
                        >
                            Visitar sitio web
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