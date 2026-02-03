import { Html, Head, Body, Container, Text, Heading, Img, Row, Column, Section, Link } from '@react-email/components';

export default function WelcomeEmail() {
    const IgaLogo = "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";
    const helmet = "https://igaproductos.com.mx/wp-content/uploads/2024/07/hit_intervalo_amarillo-e1722380739491.jpg";
    const barboquejo = "https://igaproductos.com.mx/wp-content/uploads/2025/10/007-300x300.jpg";
    const suspension = "https://igaproductos.com.mx/wp-content/uploads/2024/06/WhatsApp-Image-2024-07-04-at-5.46.15-PM-2-300x300.jpeg";
    // const glasses = "https://igaproductos.com.mx/wp-content/uploads/2024/07/ARTICO_02.jpg";
    const glasses = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400";

    const host = "https://labour-share-mpg-considerations.trycloudflare.com";
    return (
        <Html>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>
            <Body style={{
                backgroundColor: '#f6f9fc',
                fontFamily: 'Arial, sans-serif',
                maxWidth: "600px",
            }}>
                <Heading style={{
                    width: "100%",
                    paddingTop: "20px",
                    paddingBottom: "20px",
                    margin: "0px 20px 0 20px",
                    color: "#ffff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",

                }}>
                    <Img src={IgaLogo} alt="Iga Productos Logo"
                        style={{
                            width: "50%"
                        }} />
                </Heading>
                <Container>
                    <Text style={{
                        fontSize: "25px",
                        fontWeight: "bold",
                        textAlign: "center"
                    }}>Te damos la bienvenida a Iga Productos🎉</Text>
                    <Text style={{
                        color: "#6d6d6dff",
                        textAlign: "center"
                    }}>Tu seguridad es nuestra prioridad</Text>
                    <Container style={{
                        paddingRight: "20px",
                        paddingLeft: "20px",
                    }}>

                        <Text style={{
                            fontSize: "20px",
                            paddingRight: "20px",
                            paddingLeft: "20px",
                            color: "#010230ff",
                            fontWeight: "bold",
                            textAlign: "center"
                        }}>Explora nuestro catalogo de productos que tenemos para ti👷</Text>

                        <Section style={{
                            backgroundColor: "#e9e9e9ff",
                            paddingRight: "25px",
                            paddingLeft: "25px",
                            paddingTop: "15px",
                            paddingBottom: "15px",
                            borderRadius: "5px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}>
                            <Row>
                                <Column style={{
                                    width: "25%",
                                    padding: "5px",

                                }}>
                                    <Img src={helmet} alt="Cascos" style={{
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "5px",
                                        objectFit: "cover"
                                    }} />
                                    <Link href={`${host}/tienda?category=cascos`} style={{
                                        textAlign: "center",
                                        fontSize: "15px"
                                    }}>Cascos</Link>
                                </Column>
                                <Column style={{ width: "25%", padding: "5px" }}>
                                    <Img src={barboquejo} alt="Barboquejos" style={{
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "5px",
                                        objectFit: "cover"
                                    }} />
                                    <Link href={`${host}/tienda?category=barboquejos`} style={{
                                        textAlign: "center",
                                        fontSize: "15px"
                                    }}>Barboquejos</Link>
                                </Column>
                            </Row>
                            <Row>
                                <Column style={{ width: "25%", padding: "5px" }}>
                                    <Img src={suspension} alt="Suspensiones" style={{
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "5px",
                                        objectFit: "cover"
                                    }} />
                                    <Link href={`${host}/tienda?category=suspensiones`} style={{
                                        textAlign: "center",
                                        fontSize: "15px"
                                    }}>Suspensiones</Link>
                                </Column>
                                <Column style={{ width: "25%", padding: "5px" }}>
                                    <Img src={glasses} alt="Lentes de seguridad" style={{
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "5px",
                                        objectFit: "cover"
                                    }} />
                                    <Link href={`${host}/tienda?category=lentes`} style={{
                                        textAlign: "center",
                                        fontSize: "15px"
                                    }}>Lentes de seguridad</Link>
                                </Column>
                            </Row>
                        </Section>
                        <Container style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginTop: "20px"
                        }}>
                            <Link href={`${host}`} style={{
                                backgroundColor: "#010230ff",
                                color: "#ffff",
                                padding: "10px 15px 10px 15px",
                                borderRadius: "5px",
                                border: "none",
                                cursor: "pointer",
                                textAlign: "center"
                            }}>Ir al sitio web ahora ➡️</Link>

                        </Container>
                        <Section>
                            <Text style={{
                                textAlign: "center",
                                marginTop: "20px"
                            }}>Iga Productos © {new Date().getFullYear()}</Text>
                        </Section>
                    </Container>
                </Container>
            </Body>
        </Html>
    );
}