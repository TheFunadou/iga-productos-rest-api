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
} from "@react-email/components";

interface VerificationTokenEmailProps {
    token: string;
    type: "verification" | "restore-password"
}

export default function VerificationTokenEmail({
    token, type
}: VerificationTokenEmailProps) {
    const IgaLogo =
        "https://igaproductos.com.mx/wp-content/themes/igaproductos/images/igaproductos.png";

    const headingText = type === "verification" ? "Verificación de cuenta" : "Restablecimiento de contraseña";
    const heroText = type === "verification" ? "Para completar el proceso de verificación, utiliza el siguiente código de seguridad. Este código es personal y tiene una vigencia limitada." :
        "Para restablecer tu contraseña, utiliza el siguiente código de seguridad. Este código es personal y tiene una vigencia limitada.";
    const infoText = type === "verification" ? "Si no solicitaste esta verificación, puedes ignorar este mensaje. Tu seguridad es nuestra prioridad." :
        "Si no solicitaste este restablecimiento de contraseña, puedes ignorar este mensaje. Tu seguridad es nuestra prioridad.";

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
                                fontSize: "24px",
                                margin: "0 0 15px 0",
                                color: "#111827",
                                textAlign: "center",
                            }}
                        >
                            {headingText}
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                color: "#6b7280",
                                textAlign: "center",
                                lineHeight: "1.6",
                                marginBottom: "25px",
                            }}
                        >
                            {heroText}
                        </Text>
                    </Section>

                    {/* TOKEN BLOCK */}
                    <Section style={{ padding: "0 30px 30px 30px" }}>
                        <div
                            style={{
                                padding: "25px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                textAlign: "center",
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: "28px",
                                    fontWeight: "700",
                                    letterSpacing: "4px",
                                    color: "#010230",
                                    margin: 0,
                                }}
                            >
                                {token}
                            </Text>
                        </div>
                    </Section>

                    {/* INFO TEXT */}
                    <Section style={{ padding: "0 30px 40px 30px" }}>
                        <Text
                            style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                lineHeight: "1.6",
                                textAlign: "center",
                            }}
                        >
                            {infoText}
                        </Text>
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
                            © {new Date().getFullYear()} Iga Productos. Todos los derechos reservados.
                        </Text>
                        <Text
                            style={{
                                fontSize: "12px",
                                color: "#7e848dff",
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