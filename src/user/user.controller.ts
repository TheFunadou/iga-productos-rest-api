import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDTO } from './user.dto';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserPayload } from 'src/user_auth/user_auth.dto';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { };

    @Post()
    @ApiOperation({ summary: "Crear usuario" })
    @ApiResponse({ status: 201, description: "Usuario creado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al crear el usuario" })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    @ApiBody({ type: CreateUserDTO })
    async createUser(@Body() dto: CreateUserDTO) {
        return this.userService.createUser({ data: dto });
    };

    @Post("example")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ PRODUCTS: ["CREATE"] })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    @ApiOperation({ description: "test" })
    async example(@Request() request: { user: UserPayload }) {
        return request.user;
    };

    // @Get()
    // @ApiOperation({ description: "Obtener todos los usuarios" })
    // @ApiResponse({ status: 200, description: "Lista de todos los usuarios" })
    // @ApiResponse({ status: 500, description: "Error interno del servidor" })
    // async findAll() { return this.userService.findAll(); };

    // @Post("invalidate")
    // @ApiOperation({ description: "Invalidar cache" })
    // async invalidate() { return this.userService.invalidate(); };

    // @Post("delete")
    // @ApiOperation({ description: "Eliminar cache" })
    // async deleteCache() { return this.userService.deleteCache(); };
}
