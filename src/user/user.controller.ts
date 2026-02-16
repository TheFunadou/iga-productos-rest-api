import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDTO, GetUserDashboard, UpdateUserDTO, UserDashboardParams } from './user.dto';
import { ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { AuthenticatedUser } from 'src/user_auth/user_auth.current_user.decorator';
import { UserPayload } from 'src/user_auth/user_auth.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { };

    @Post()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ USERS: ["CREATE"] })
    @ApiOperation({ summary: "Crear usuario" })
    @ApiResponse({ status: 200, description: "Usuario creado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al crear el usuario" })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    @ApiHeader({ name: "X-CSRF-Token", description: "Token CSRF" })
    @ApiBody({ type: CreateUserDTO })
    async createUser(@Body() dto: CreateUserDTO, @AuthenticatedUser() user: UserPayload): Promise<string> {
        return this.userService.create({ data: dto, userUUID: user.uuid });
    };

    @Get()
    @UseGuards(RequiredUserAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ USERS: ["READ"] })
    @ApiOperation({ description: "Obtener dashboard de usuarios" })
    @ApiResponse({ status: 200, description: "Lista de todos los usuarios" })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    @ApiQuery({ name: "limit", description: "Cantidad de usuarios por pagina", required: true })
    @ApiQuery({ name: "page", description: "Pagina actual", required: true })
    @ApiQuery({ name: "orderby", description: "Ordenamiento (asc por defecto)", enum: ["asc", "desc"], required: false })
    @ApiQuery({ name: "user", description: "Nombre de usuario", required: false })
    async dashboard(@Query() query: UserDashboardParams): Promise<GetUserDashboard> {
        return await this.userService.dashboard({ query });
    };

    @Patch()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ USERS: ["UPDATE"] })
    @ApiOperation({ description: "Actualizar usuario" })
    @ApiResponse({ status: 200, description: "Usuario actualizado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al actualizar el usuario" })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    @ApiHeader({ name: "X-CSRF-Token", description: "Token CSRF" })
    @ApiBody({ type: UpdateUserDTO })
    async update(@Body() dto: UpdateUserDTO, @AuthenticatedUser() { uuid }: UserPayload): Promise<string> {
        return await this.userService.update({ data: dto, userUUID: uuid })
    };

    @Delete("/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ USERS: ["DELETE"] })
    @ApiOperation({ description: "Eliminar usuario" })
    @ApiResponse({ status: 200, description: "Usuario eliminado exitosamente" })
    @ApiResponse({ status: 400, description: "Error al eliminar el usuario" })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    @ApiHeader({ name: "X-CSRF-Token", description: "Token CSRF" })
    @ApiBody({ type: UpdateUserDTO })
    async remove(@AuthenticatedUser() user: UserPayload, @Param("uuid") targetUUID: string): Promise<string> {
        return await this.userService.remove({ userUUID: user.uuid, targetUUID })
    };

};
