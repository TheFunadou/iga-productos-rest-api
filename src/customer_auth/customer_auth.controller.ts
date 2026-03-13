import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CustomerAuthService } from './customer_auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthCustomer, CustomerCredentialsDTO, CustomerPayload, GoogleAuthDTO, RestorePasswordAuthDTO, RestorePasswordPublicDTO } from './customer_auth.dto';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { RequiredCustomerAuthGuard } from './customer_auth.required.guard';
import { AuthenticatedCustomer } from './customer_auth.current.decorator';
import { ConfigService } from '@nestjs/config';
import { OptionalCustomerAuthGuard } from './customer_auth.optional.guard';
import { OptionalCustomer } from './customer_auth.optional.decorator';
import { UpdateCustomerDTO } from 'src/customer/customer.dto';
import { CustomerCsrfAuthGuard } from './customer_auth.csrf';

@Controller('customer-auth')
export class CustomerAuthController {
    private readonly nodeEnv: string;
    constructor(
        private readonly customerAuthService: CustomerAuthService,
        private readonly configService: ConfigService
    ) {
        this.nodeEnv = this.configService.get<string>("NODE_ENV") || "DEV";
    };

    @Post("login")
    @ApiOperation({ summary: "Inicia sesión de un usuario" })
    @ApiResponse({ status: 20, description: "Sesión iniciada exitosamente", type: AuthCustomer })
    @ApiResponse({ status: 500, description: "Error al iniciar sesión" })
    @ApiBody({ type: CustomerCredentialsDTO })
    async login(
        @Body() dto: CustomerCredentialsDTO,
        @Res({ passthrough: true }) response: ExpressResponse,
    ): Promise<AuthCustomer> {
        const login = await this.customerAuthService.login(dto);
        const secure = this.nodeEnv === "production" || this.nodeEnv === "testing" ? true : false;
        const sameSite = this.nodeEnv === "production" || this.nodeEnv === "testing" ? "strict" : "lax";
        // const tunnelSameSite = "none";
        response.cookie("iga_customer_access_token", login.access_token, {
            httpOnly: true,
            secure,
            sameSite,
            domain: ".igaproductos.com",
            maxAge: 1000 * 60 * 60 * 24,
        });

        response.cookie("iga_customer_csrf_token", login.csrfToken, {
            httpOnly: false,
            secure,
            sameSite,
            domain: ".igaproductos.com",
            maxAge: 1000 * 60 * 60 * 24,
        });


        return { payload: login.payload, csrfToken: login.csrfToken };
    };

    @Post("login/google")
    @ApiOperation({ summary: "Inicia sesión con Google OAuth" })
    @ApiResponse({ status: 201, description: "Sesión iniciada exitosamente con Google", type: AuthCustomer })
    @ApiResponse({ status: 401, description: "Token de Google inválido o expirado" })
    @ApiResponse({ status: 400, description: "No se pudo obtener información del perfil de Google" })
    @ApiBody({ type: GoogleAuthDTO })
    async loginWithGoogle(
        @Body() dto: GoogleAuthDTO,
        @Res({ passthrough: true }) response: ExpressResponse,
    ): Promise<AuthCustomer> {
        const login = await this.customerAuthService.loginWithGoogle(dto);
        const secure = this.nodeEnv === "production" || this.nodeEnv === "testing" ? true : false;
        const sameSite = this.nodeEnv === "production" || this.nodeEnv === "testing" ? "strict" : "lax";
        // const tunnelSameSite = "none";
        response.cookie("iga_customer_access_token", login.access_token, {
            httpOnly: true,
            secure,
            sameSite,
            domain: ".igaproductos.com",
            maxAge: 1000 * 60 * 60 * 24,
        });

        response.cookie("iga_customer_csrf_token", login.csrfToken, {
            httpOnly: false,
            secure,
            sameSite,
            domain: ".igaproductos.com",
            maxAge: 1000 * 60 * 60 * 24,
        });
        return { payload: login.payload, csrfToken: login.csrfToken };
    };

    @Post("logout")
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Cierra sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión cerrada exitosamente" })
    @ApiResponse({ status: 500, description: "Error al cerrar sesión" })
    async logout(
        @Res({ passthrough: true }) response: ExpressResponse,
    ): Promise<string> {
        response.clearCookie("iga_customer_access_token");
        response.clearCookie("iga_customer_csrf_token");
        return "Sesión cerrada";

    };


    @Get("profile")
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Obtiene el perfil de un usuario" })
    @ApiResponse({ status: 200, description: "Perfil obtenido exitosamente", type: AuthCustomer })
    @ApiResponse({ status: 500, description: "Error al obtener el perfil" })
    async getProfile(
        @AuthenticatedCustomer() user: CustomerPayload
    ): Promise<AuthCustomer> {
        return await this.customerAuthService.getProfile({ uuid: user.uuid });
    };

    @Post("verification/token/send")
    @ApiOperation({ summary: "Envia un token de verificación al correo del usuario" })
    @ApiResponse({ status: 200, description: "Token enviado exitosamente" })
    @ApiResponse({ status: 500, description: "Error al enviar el token" })
    async sendTokenToEmail(
        @Body() dto: { sessionId: string, email: string }
    ): Promise<string> {
        await this.customerAuthService.sendTokenToEmail({ sessionId: dto.sessionId, email: dto.email, type: "verification" });
        return "Código de verificación enviado a tu correo";
    };

    @Post("verification/token/resend")
    @ApiOperation({ summary: "Reenvia un token de verificación al correo del usuario" })
    @ApiResponse({ status: 200, description: "Token reenviado exitosamente" })
    @ApiResponse({ status: 500, description: "Error al reenviar el token" })
    async resendTokenToEmail(
        @Body() dto: { sessionId: string, email: string }
    ): Promise<string> {
        await this.customerAuthService.resendTokenToEmail({ sessionId: dto.sessionId, email: dto.email, type: "verification" });
        return "Código de verificación reenviado a tu correo";
    };

    @Post("password")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Restablece la contraseña del usuario" })
    @ApiResponse({ status: 200, description: "Contraseña restablecida exitosamente" })
    @ApiResponse({ status: 500, description: "Error al restablecer la contraseña" })
    async restorePasswordAuth(
        @Body() dto: UpdateCustomerDTO,
        @OptionalCustomer() customer: CustomerPayload
    ): Promise<string> {
        return await this.customerAuthService.restorePasswordAuth({ dto, customerUUID: customer.uuid });
    };

    @Post("password/restore")
    @ApiOperation({ summary: "Restablece la contraseña del usuario" })
    @ApiResponse({ status: 200, description: "Contraseña restablecida exitosamente" })
    @ApiResponse({ status: 500, description: "Error al restablecer la contraseña" })
    async restorePasswordPublic(
        @Body() dto: RestorePasswordPublicDTO,
    ): Promise<string> {
        return await this.customerAuthService.restorePasswordPublic({ dto });
    };

    @Post("password/restore/token/validate")
    @UseGuards(OptionalCustomerAuthGuard)
    @ApiOperation({ summary: "Valida un token de restablecimiento de contraseña" })
    @ApiResponse({ status: 200, description: "Token validado exitosamente" })
    @ApiResponse({ status: 500, description: "Error al validar el token" })
    async validateRestorePasswordToken(
        @Body() dto: { sessionId: string, email: string, restorePasswordToken: string }
    ): Promise<boolean> {
        return await this.customerAuthService.validateRestorePasswordToken({ sessionId: dto.sessionId, email: dto.email, token: dto.restorePasswordToken });
    };

    @Post("password/restore/token/send")
    @ApiOperation({ summary: "Envia un token de restablecimiento de contraseña al correo del usuario" })
    @ApiResponse({ status: 200, description: "Token enviado exitosamente" })
    @ApiResponse({ status: 500, description: "Error al enviar el token" })
    async sendRestorePasswordToken(
        @Body() dto: { sessionId: string, email: string },
    ): Promise<string> {
        await this.customerAuthService.sendRestorePasswordTokenToEmail({ sessionId: dto.sessionId, email: dto.email });
        return "Código de restablecimiento de contraseña enviado a tu correo";
    };

    @Post("password/restore/token/resend")
    @ApiOperation({ summary: "Reenvia un token de restablecimiento de contraseña al correo del usuario" })
    @ApiResponse({ status: 200, description: "Token reenviado exitosamente" })
    @ApiResponse({ status: 500, description: "Error al reenviar el token" })
    async resendRestorePasswordToken(
        @Body() dto: { sessionId: string, email: string }
    ): Promise<string> {
        await this.customerAuthService.resendTokenToEmail({ sessionId: dto.sessionId, email: dto.email, type: "restore-password" });
        return "Código de restablecimiento de contraseña reenviado a tu correo";
    };

};
