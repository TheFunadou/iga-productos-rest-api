import { Body, Controller, Get, Post, Res, Req, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserAuthService } from './user_auth.service';
import { AuthUser, UserCredentialsDTO, UserPayload } from './user_auth.dto';
import { AuthenticatedUser } from './user_auth.current_user.decorator';
import { RequiredUserAuthGuard } from './user_auth.required.guard';
import { ConfigService } from '@nestjs/config';
import { UserCsrfAuthGuard } from './user_auth.csrf';
import { USER_COOKIE_NAME } from './user_auth.strategy';

@Controller('user-auth')
export class UserAuthController {
    private readonly nodeEnv: string;
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly configService: ConfigService
    ) {
        this.nodeEnv = this.configService.get<string>("NODE_ENV") || "DEV";
    };

    @Post("login")
    @UseGuards(UserCsrfAuthGuard)
    @ApiOperation({ summary: "Inicia sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión iniciada exitosamente", type: AuthUser })
    @ApiResponse({ status: 500, description: "Error al iniciar sesión" })
    @ApiBody({ type: UserCredentialsDTO })
    async login(
        @Body() dto: UserCredentialsDTO,
        @Res({ passthrough: true }) response: ExpressResponse,
    ): Promise<AuthUser> {
        const { access_token, payload } = await this.userAuthService.login(dto);
        const secure = this.nodeEnv === "production" || this.nodeEnv === "testing" ? true : false;
        const sameSite = "lax";
        const domain = this.nodeEnv === "production" || this.nodeEnv === "testing" ? ".igaproductos.com" : undefined;
        response.cookie(USER_COOKIE_NAME, access_token, {
            httpOnly: true,
            secure,
            sameSite,
            domain,
            maxAge: 1000 * 60 * 60 * 24,
        });

        return { payload };
    };

    @Post("logout")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard)
    @ApiOperation({ summary: "Cierra sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión cerrada exitosamente" })
    @ApiResponse({ status: 500, description: "Error al cerrar sesión" })
    async logout(
        @Res({ passthrough: true }) response: ExpressResponse,
        @Req() request: ExpressRequest,
        @AuthenticatedUser() user: UserPayload
    ): Promise<string> {
        await this.userAuthService.logout(user.uuid);
        response.clearCookie(USER_COOKIE_NAME);
        response.clearCookie("csrf_token");
        response.clearCookie("session_id");
        return "Sesión cerrada";

    };

    @Get("init")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard)
    @ApiOperation({ summary: "Obtiene el usuario actual" })
    @ApiResponse({ status: 200, description: "Usuario obtenido exitosamente", type: UserPayload })
    @ApiResponse({ status: 500, description: "Error al obtener el usuario" })
    async init(): Promise<string> {
        return "ok";
    };
}
