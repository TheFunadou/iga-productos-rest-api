import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CustomerAddressesService } from './customer-addresses.service';
import { AuthenticatedCustomer } from 'src/customer_auth/customer_auth.current.decorator';
import { CustomerPayload } from 'src/customer_auth/customer_auth.dto';
import { CreateCustomerAddressDTO } from './customer-addresses.dto';
import { RequiredCustomerAuthGuard } from 'src/customer_auth/customer_auth.required.guard';
import { CustomerCsrfAuthGuard } from 'src/customer_auth/customer_auth.csrf';
import { ApiBody, ApiCreatedResponse, ApiHeader, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('customer-addresses')
export class CustomerAddressesController {
    constructor(private readonly customerAddressesService: CustomerAddressesService) { };

    @Post()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Crear una nueva dirección de envio" })
    @ApiResponse({ status: 201, description: "Dirección de envio creada exitosamente" })
    @ApiResponse({ status: 401, description: "No autenticado" })
    @ApiResponse({ status: 403, description: "No autorizado" })
    @ApiResponse({ status: 404, description: "Cliente no encontrado" })
    @ApiResponse({ status: 409, description: "Dirección de envio ya existente" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    @ApiCreatedResponse({ description: "Dirección de envio creada exitosamente" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF" })
    @ApiBody({ type: CreateCustomerAddressDTO })
    async create(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: CreateCustomerAddressDTO) {
        return await this.customerAddressesService.create({ customerUUID: customer.uuid, data: dto });
    };

    @Patch()
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Actualizar una dirección de envio" })
    @ApiResponse({ status: 200, description: "Dirección de envio actualizada exitosamente" })
    @ApiResponse({ status: 401, description: "No autenticado" })
    @ApiResponse({ status: 403, description: "No autorizado" })
    @ApiResponse({ status: 404, description: "Cliente no encontrado" })
    @ApiResponse({ status: 409, description: "Dirección de envio ya existente" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    @ApiCreatedResponse({ description: "Dirección de envio actualizada exitosamente" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF" })
    @ApiBody({ type: CreateCustomerAddressDTO })
    async patch(@AuthenticatedCustomer() customer: CustomerPayload, @Body() dto: CreateCustomerAddressDTO) {
        return await this.customerAddressesService.patch({ customerUUID: customer.uuid, data: dto });
    };

    @Delete("/:uuid")
    @UseGuards(RequiredCustomerAuthGuard, CustomerCsrfAuthGuard)
    @ApiOperation({ summary: "Eliminar una dirección de envio" })
    @ApiResponse({ status: 200, description: "Dirección de envio eliminada exitosamente" })
    @ApiResponse({ status: 401, description: "No autenticado" })
    @ApiResponse({ status: 403, description: "No autorizado" })
    @ApiResponse({ status: 404, description: "Cliente no encontrado" })
    @ApiResponse({ status: 500, description: "Error inesperado" })
    @ApiCreatedResponse({ description: "Dirección de envio eliminada exitosamente" })
    @ApiParam({ name: "uuid", description: "UUID de la dirección de envio" })
    @ApiHeader({ name: "X-CSRF-TOKEN", description: "Token CSRF" })
    async delete(@AuthenticatedCustomer() customer: CustomerPayload, @Param("uuid") uuid: string) {
        return await this.customerAddressesService.delete({ customerUUID: customer.uuid, uuid });
    };
};
