import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerAddressDTO, UpdateCustomerAddressDTO } from './customer-addresses.dto';

@Injectable()
export class CustomerAddressesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };


    async create(args: { customerUUID: string, data: CreateCustomerAddressDTO }) {
        const customer = await this.prisma.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
        if (!customer) throw new NotFoundException("Cliente no encontrado");
        return await this.prisma.$transaction(async (tx) => {
            const addressesCount = await tx.customerAddresses.count({ where: { customer_id: customer.id } });
            if (addressesCount <= 0 && args.data.default_address === false) args.data.default_address = true;
            if (addressesCount > 0 && args.data.default_address) {
                await tx.customerAddresses.updateMany({ where: { customer_id: customer.id }, data: { default_address: false } });
            };
            const created = await tx.customerAddresses.create({
                data: { ...args.data, customer_id: customer.id },
                omit: { id: true, customer_id: true, created_at: true, updated_at: true }
            }).catch((error) => { throw new BadRequestException("Ocurrio un error inesperado al crear la dirección de envio") });
            await this.cacheService.invalidateQuery({ entity: "customer:addresses", query: { customer: args.customerUUID } });
            return created;
        });
    };

    async patch(args: { customerUUID: string, data: UpdateCustomerAddressDTO }) {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
            if (!customer) throw new NotFoundException("Cliente no encontrado");
            const addresses = await tx.customerAddresses.findMany({ where: { customer_id: customer.id }, omit: { id: true, customer_id: true } });
            const currentAddress = addresses.find((addr) => addr.uuid === args.data.uuid);
            if (!currentAddress) throw new NotFoundException("Direccion no encontrada");
            let defaultAddress = false;
            if (args.data.default_address && currentAddress.default_address) defaultAddress = true;
            if (args.data.default_address && !currentAddress.default_address) {
                await tx.customerAddresses.updateMany({
                    where: { customer_id: customer.id, uuid: { not: args.data.uuid } },
                    data: { default_address: false }
                });
                defaultAddress = true;
            };
            if (args.data.default_address && addresses.length === 1 && currentAddress.default_address) defaultAddress = true;
            if (!args.data.default_address) {
                if (!currentAddress.default_address && addresses.length > 1) {
                    // Set another address as default
                    const otherAddress = addresses.find((addr) => addr.uuid !== args.data.uuid);
                    if (otherAddress) {
                        await tx.customerAddresses.update({
                            where: { uuid: otherAddress.uuid },
                            data: { default_address: true }
                        });
                    };
                    defaultAddress = false;
                };
                if (!currentAddress.default_address && addresses.length > 1) defaultAddress = false;
                if (!currentAddress.default_address && addresses.length === 1) defaultAddress = true;
            };

            await tx.customerAddresses.update({
                where: { uuid: args.data.uuid },
                data: { default_address: defaultAddress },
                omit: { id: true, customer_id: true, created_at: true, updated_at: true }
            }).catch((error) => { throw new BadRequestException("Ocurrio un error inesperado al actualizar la dirección de envio") });

            await this.cacheService.invalidateQuery({ entity: "customer:addresses", query: { customer: args.customerUUID } });
            return "Dirección de envio actualizada satisfactoriamente";
        });
    };

    async delete(args: { customerUUID: string, uuid: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
            if (!customer) throw new NotFoundException("Cliente no encontrado");
            const address = await tx.customerAddresses.findUnique({ where: { uuid: args.uuid }, select: { id: true } });
            if (!address) throw new NotFoundException("Direccion no encontrada");
            await tx.customerAddresses.delete({ where: { id: address.id, customer_id: customer.id } }).catch((error) => { throw new BadRequestException("Ocurrio un error inesperado al eliminar la dirección de envio") });
            const addresses = await tx.customerAddresses.findMany({ where: { customer_id: customer.id }, omit: { customer_id: true, id: true }, orderBy: [{ default_address: "desc" }, { created_at: "desc" }] });
            const findDefaultAddress = addresses.some((addr) => addr.default_address);
            if (!findDefaultAddress && addresses.length > 0) await tx.customerAddresses.update({ where: { uuid: addresses[0].uuid }, data: { default_address: true } }).catch((error) => { throw new BadRequestException("Ocurrio un error inesperado al actualizar la dirección de envio") });
            await this.cacheService.invalidateQuery({ entity: "customer:addresses", query: { customer: args.customerUUID } });
            return "Dirección de envio eliminada satisfactoriamente";
        });
    };

    async findAll(args: { pagination: { take: number, page: number }, customerUUID: string }) {
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: args.customerUUID }, select: { id: true } });
            if (!customer) throw new NotFoundException("Cliente no encontrado");
            return await this.cacheService.remember({
                method: "staleWhileRevalidate",
                entity: "customer:addresses",
                query: { customer: args.customerUUID },
                aditionalOptions: {
                    ttlMilliseconds: 1000 * 60 * 15,
                    staleTimeMilliseconds: 1000 * 60 * 10
                },
                fallback: async () => {
                    return await this.prisma.customerAddresses.findMany({
                        where: { customer_id: customer.id },
                        omit: { customer_id: true, id: true, created_at: true, updated_at: true },
                        orderBy: [{ default_address: "desc" }, { created_at: "desc" }]
                    });
                }
            })
        });
    };
};
