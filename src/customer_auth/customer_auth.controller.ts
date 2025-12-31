import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CustomerAuthService } from './customer_auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthCustomer, CustomerCredentialsDTO, CustomerPayload } from './customer_auth.dto';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { RequiredCustomerAuthGuard } from './customer_auth.required.guard';
import { AuthenticatedCustomer } from './customer_auth.current.decorator';

@Controller('customer-auth')
export class CustomerAuthController {
    constructor(
        private readonly customerAuthService: CustomerAuthService
    ) { };

    @Post("login")
    @ApiOperation({ summary: "Inicia sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión iniciada exitosamente", type: AuthCustomer })
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
            secure: false,
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 1000 * 60 * 60 * 24,
        });

        response.cookie("iga_customer_csrf_token", login.csrfToken, {
            httpOnly: false,
            secure: false,
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
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
        @Req() request: ExpressRequest,
        @AuthenticatedCustomer() user: CustomerPayload
    ): Promise<string> {
        response.clearCookie("iga_customer_access_token");
        response.clearCookie("iga_customer_csrf_token");
        return "Sesión cerrada";

    };
}
