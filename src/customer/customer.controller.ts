import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDTO } from './customer.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiHeader } from '@nestjs/swagger';
import { RequiredUserAuthGuard } from 'src/user_auth/user_auth.required.guard';
import { UserCsrfAuthGuard } from 'src/user_auth/user_auth.csrf';
import { UserModulePermissionsGuard } from 'src/user_auth/user_auth.module.permissions.guard';
import { RequirePermissions } from 'src/user_auth/user_auth.module.permissions.decorator';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';

@Controller('customer')
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { };

    @Post()
    @ApiOperation({ summary: "Crear/registrar un nuevo cliente" })
    @ApiResponse({ status: 201, description: "Cliente creado exitosamente" })
    @ApiResponse({ status: 400, description: "Error en la solicitud" })
    @ApiResponse({ status: 409, description: "Cliente ya registrado" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    @ApiBody({ type: CreateCustomerDTO })
    async register(@Body() dto: CreateCustomerDTO) {
        return await this.customerService.register({ data: dto });
    };

    @Get()
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ CUSTOMERS: ["READ"] })
    @ApiOperation({ summary: "Obtener todos los clientes" })
    @ApiResponse({ status: 200, description: "Clientes obtenidos exitosamente" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    @ApiQuery({ name: "page", type: Number, required: false, default: 1 })
    @ApiQuery({ name: "limit", type: Number, required: false, default: 10 })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async findAll(@Query() query: { page: number, limit: number }) {
        return await this.customerService.findAll({ page: query.page, limit: query.limit });
    };

    @Get("/:uuid")
    @UseGuards(RequiredUserAuthGuard, UserCsrfAuthGuard, UserModulePermissionsGuard)
    @RequirePermissions({ CUSTOMERS: ["READ"] })
    @ApiOperation({ summary: "Obtener un cliente por su UUID" })
    @ApiResponse({ status: 200, description: "Cliente obtenido exitosamente" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    @ApiParam({ name: "uuid", type: String, required: true })
    @ApiHeader({ name: "x-csrf-token", description: "Token CSRF", required: true })
    async findUnique(@Param("uuid") uuid: string) {
        return await this.customerService.findUnique({ uuid });
    };

    @Get("reviews")
    @UseGuards(RequiredCustomerAuthGuard)
    @ApiOperation({ summary: "Obtener todos los comentarios de un cliente" })
    @ApiResponse({ status: 200, description: "Comentarios obtenidos exitosamente" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    async findManyReviews(@AuthenticatedCustomer() customer: CustomerPayload) {
        return await this.customerService.findManyReviews({ customerUUID: customer.uuid });
    };
};
