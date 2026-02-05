import { Body, Controller, Get, Post, Res, Req, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserAuthService } from './user_auth.service';
import { AuthUser, UserCredentialsDTO, UserPayload } from './user_auth.dto';
import { AuthenticatedUser } from './user_auth.current_user.decorator';
import { RequiredUserAuthGuard } from './user_auth.required.guard';
import { ConfigService } from '@nestjs/config';

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
    @ApiOperation({ summary: "Inicia sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión iniciada exitosamente", type: AuthUser })
    @ApiResponse({ status: 500, description: "Error al iniciar sesión" })
    @ApiBody({ type: UserCredentialsDTO })
    async login(
        @Body() dto: UserCredentialsDTO,
        @Res({ passthrough: true }) response: ExpressResponse,
        @Req() request: ExpressRequest
    ): Promise<AuthUser> {
        const login = await this.userAuthService.login(dto);
        response.cookie("iga_user_access_token", login.access_token, {
            httpOnly: true,
            secure: this.nodeEnv === "PROD",
            sameSite: this.nodeEnv === "PROD" ? "strict" : "lax",
            maxAge: 1000 * 60 * 60 * 24,
        });

        response.cookie("iga_user_csrf_token", login.csrfToken, {
            httpOnly: false,
            secure: this.nodeEnv === "PROD",
            sameSite: this.nodeEnv === "PROD" ? "strict" : "lax",
            maxAge: 1000 * 60 * 60 * 24,
        });

        return { payload: login.payload, csrfToken: login.csrfToken };
    };

    @Post("logout")
    @UseGuards(RequiredUserAuthGuard)
    @ApiOperation({ summary: "Cierra sesión de un usuario" })
    @ApiResponse({ status: 200, description: "Sesión cerrada exitosamente" })
    @ApiResponse({ status: 500, description: "Error al cerrar sesión" })
    async logout(
        @Res({ passthrough: true }) response: ExpressResponse,
        @Req() request: ExpressRequest,
        @AuthenticatedUser() user: UserPayload
    ): Promise<string> {
        await this.userAuthService.logout(user.uuid);
        response.clearCookie("iga_user_access_token");
        response.clearCookie("iga_user_csrf_token");
        return "Sesión cerrada";

    };
}
