import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerAddressDTO, GetCustomerAddresses, UpdateCustomerAddressDTO } from './customer-addresses.dto';

@Injectable()
export class CustomerAddressesService {
    private readonly nodeEnv = process.env.NODE_ENV;

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
            const customer = await tx.customer.findUnique({
                where: { uuid: args.customerUUID },
                select: { id: true }
            });
            if (!customer) throw new NotFoundException("Cliente no encontrado");

            const currentAddress = await tx.customerAddresses.findUnique({
                where: { uuid: args.data.uuid },
                select: { uuid: true, default_address: true, customer_id: true }
            });

            if (!currentAddress) throw new NotFoundException("Direccion no encontrada");
            if (currentAddress.customer_id !== customer.id) throw new BadRequestException("Esta dirección no pertenece al cliente");

            // Extraer uuid del DTO para no incluirlo en la actualización
            const { uuid, ...updateData } = args.data;

            // Si se está marcando como default, desmarcar las demás
            if (updateData.default_address && !currentAddress.default_address) {
                await tx.customerAddresses.updateMany({
                    where: { customer_id: customer.id, uuid: { not: uuid } },
                    data: { default_address: false }
                });
            }

            // Actualizar la dirección con TODOS los campos enviados
            await tx.customerAddresses.update({
                where: { uuid },
                data: updateData,
                omit: { id: true, customer_id: true, created_at: true, updated_at: true }
            });

            await this.cacheService.invalidateQuery({
                entity: "customer:addresses",
                query: { customer: args.customerUUID }
            });

            return "Dirección de envio actualizada satisfactoriamente";
        });
    }

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

    async findAll(args: { pagination: { limit: number, page: number }, customerUUID: string }): Promise<GetCustomerAddresses> {
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
                    const addresses = await this.prisma.customerAddresses.findMany({
                        take: args.pagination.limit,
                        skip: (args.pagination.page - 1) * args.pagination.limit,
                        where: { customer_id: customer.id },
                        omit: { customer_id: true, id: true, created_at: true, updated_at: true },
                        orderBy: [{ default_address: "desc" }, { created_at: "desc" }]
                    });

                    const totalRecords = await this.prisma.customerAddresses.count({ where: { customer_id: customer.id } });
                    const totalPages = Math.ceil(totalRecords / args.pagination.limit);

                    return { data: addresses, totalRecords, totalPages };
                }
            })
        });
    };
};
