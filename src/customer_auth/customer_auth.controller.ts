import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CustomerAuthService } from './customer_auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthCustomer, CustomerCredentialsDTO, CustomerPayload } from './customer_auth.dto';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { RequiredCustomerAuthGuard } from './customer_auth.required.guard';
import { AuthenticatedCustomer } from './customer_auth.current.decorator';
import { ConfigService } from '@nestjs/config';

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
        @Req() request: ExpressRequest
    ): Promise<AuthCustomer> {
        const login = await this.customerAuthService.login(dto);
        response.cookie("iga_customer_access_token", login.access_token, {
            httpOnly: true,
            secure: this.nodeEnv === "PROD",
            sameSite: this.nodeEnv === "PROD" ? "strict" : "lax",
            maxAge: 1000 * 60 * 60 * 24,
        });

        response.cookie("iga_customer_csrf_token", login.csrfToken, {
            httpOnly: false,
            secure: this.nodeEnv === "PROD",
            sameSite: this.nodeEnv === "PROD" ? "strict" : "lax",
            maxAge: 1000 * 60 * 60 * 24,
        });

        //For tunnels
        // response.cookie("iga_customer_access_token", login.access_token, {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: "none",
        //     maxAge: 1000 * 60 * 60 * 24,
        // });

        // response.cookie("iga_customer_csrf_token", login.csrfToken, {
        //     httpOnly: false,
        //     secure: true,
        //     sameSite: "none",
        //     maxAge: 1000 * 60 * 60 * 24,
        // });


        return { payload: login.payload, csrfToken: login.csrfToken };
    };

    @Post("logout")
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Cierra sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión cerrada exitosamente" })
    @ApiResponse({ status: 500, description: "Error al cerrar sesión" })
    async logout(
        @Res({ passthrough: true }) response: ExpressResponse,
        @Req() request: ExpressRequest,
        @AuthenticatedCustomer() user: CustomerPayload
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
};
