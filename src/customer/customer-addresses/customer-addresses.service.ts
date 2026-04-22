import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCustomerAddressDTO } from './customer-addresses.dto';
import { PaginationDTO } from 'src/common/DTO/common.dto';
import { CreateCustomerAddressDTO } from './application/DTO/customer-addresses.dto';
import { CustomerAddressesCacheQKI, CustomerAddressI, GetCustomerAddressesI } from './application/interfaces/customer-addresses.interface';

@Injectable()
export class CustomerAddressesService {
    public customerAddressesCacheEntity = "customer:addresses";

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService
    ) { };


    async create({ customerUUID, dto }: { customerUUID: string, dto: CreateCustomerAddressDTO }): Promise<CustomerAddressI> {
        const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
        if (!customer) throw new NotFoundException("Cliente no encontrado");
        return await this.prisma.$transaction(async (tx) => {
            const addressesCount = await tx.customerAddresses.count({ where: { customer_id: customer.id } });
            if (addressesCount <= 0 && dto.defaultAddress === false) dto.defaultAddress = true;
            if (addressesCount > 0 && dto.defaultAddress) {
                await tx.customerAddresses.updateMany({ where: { customer_id: customer.id }, data: { default_address: false } });
            };
            try {
                const created = await tx.customerAddresses.create({
                    data: {
                        recipient_name: dto.recipientName,
                        recipient_last_name: dto.recipientLastName,
                        country: dto.country,
                        state: dto.state,
                        city: dto.city,
                        locality: dto.locality,
                        street_name: dto.streetName,
                        neighborhood: dto.neighborhood,
                        zip_code: dto.zipCode,
                        address_type: dto.addressType,
                        floor: dto.floor,
                        number: dto.number,
                        aditional_number: dto.aditionalNumber,
                        references_or_comments: dto.referencesOrComments,
                        country_phone_code: dto.countryPhoneCode,
                        contact_number: dto.contactNumber,
                        default_address: dto.defaultAddress,
                        customer_id: customer.id
                    },
                    omit: { id: true, customer_id: true, created_at: true, updated_at: true }
                });
                const query: CustomerAddressesCacheQKI = { customerUUID };
                await this.cacheService.invalidateQuery({ entity: this.customerAddressesCacheEntity, query });
                return {
                    uuid: created.uuid,
                    recipientName: created.recipient_name,
                    recipientLastName: created.recipient_last_name,
                    country: created.country,
                    state: created.state,
                    city: created.city,
                    locality: created.locality,
                    streetName: created.street_name,
                    neighborhood: created.neighborhood,
                    zipCode: created.zip_code,
                    addressType: created.address_type,
                    floor: created.floor,
                    number: created.number,
                    aditionalNumber: created.aditional_number,
                    referencesOrComments: created.references_or_comments,
                    countryPhoneCode: created.country_phone_code,
                    contactNumber: created.contact_number,
                    defaultAddress: created.default_address,
                } satisfies CustomerAddressI;
            } catch (error) {
                throw new BadRequestException("Ocurrio un error inesperado al crear la dirección de envio");
            }
        });
    };

    async patch({ customerUUID, dto }: { customerUUID: string, dto: UpdateCustomerAddressDTO }) {
        const query: CustomerAddressesCacheQKI = { customerUUID };
        try {
            return await this.prisma.$transaction(async (tx) => {
                const customer = await tx.customer.findUnique({
                    where: { uuid: customerUUID },
                    select: { id: true }
                });
                if (!customer) throw new NotFoundException("Cliente no encontrado");

                const currentAddress = await tx.customerAddresses.findUnique({
                    where: { uuid: dto.uuid },
                    select: { uuid: true, default_address: true, customer_id: true }
                });

                if (!currentAddress) throw new NotFoundException("Direccion no encontrada");
                if (currentAddress.customer_id !== customer.id) throw new BadRequestException("Esta dirección no pertenece al cliente");

                // Extraer uuid del DTO para no incluirlo en la actualización
                const { uuid, ...updateData } = dto;

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
                    entity: this.customerAddressesCacheEntity,
                    query
                });

                return "Dirección de envio actualizada satisfactoriamente";
            });
        } catch (error) {
            throw new BadRequestException("Ocurrio un error inesperado al actualizar la dirección de envio");
        }
    }

    async delete({ customerUUID, uuid }: { customerUUID: string, uuid: string }) {
        const query: CustomerAddressesCacheQKI = { customerUUID };
        try {
            return await this.prisma.$transaction(async (tx) => {
                const customer = await tx.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
                if (!customer) throw new NotFoundException("Cliente no encontrado");
                const address = await tx.customerAddresses.findUnique({ where: { uuid }, select: { id: true } });
                if (!address) throw new NotFoundException("Direccion no encontrada");
                await tx.customerAddresses.delete({ where: { id: address.id, customer_id: customer.id } })
                const addresses = await tx.customerAddresses.findMany({ where: { customer_id: customer.id }, omit: { customer_id: true, id: true }, orderBy: [{ default_address: "desc" }, { created_at: "desc" }] });
                const findDefaultAddress = addresses.some((addr) => addr.default_address);
                if (!findDefaultAddress && addresses.length > 0) await tx.customerAddresses.update({ where: { uuid: addresses[0].uuid }, data: { default_address: true } })
                await this.cacheService.invalidateQuery({ entity: this.customerAddressesCacheEntity, query });
                return "Dirección de envio eliminada satisfactoriamente";
            });
        } catch (error) {
            throw new BadRequestException("Ocurrio un error inesperado al eliminar la dirección de envio");
        }
    };

    async findOne({ uuid }: { uuid: string }) {
        return await this.prisma.customerAddresses.findUnique({ where: { uuid }, omit: { id: true, customer_id: true } });
    };

    async findAll({ query, customerUUID }: { query: PaginationDTO, customerUUID: string }): Promise<GetCustomerAddressesI> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const orderBy = query.orderBy ?? "desc";
        const skip = (page - 1) * limit;

        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { uuid: customerUUID }, select: { id: true } });
            if (!customer) throw new NotFoundException("Cliente no encontrado");
            return await this.cacheService.remember<GetCustomerAddressesI>({
                method: "staleWhileRevalidate",
                entity: this.customerAddressesCacheEntity,
                query: { customerUUID },
                aditionalOptions: {
                    ttlMilliseconds: 1000 * 60 * 15,
                    staleTimeMilliseconds: 1000 * 60 * 10
                },
                fallback: async () => {
                    const addresses = await this.prisma.customerAddresses.findMany({
                        take: limit,
                        skip,
                        where: { customer_id: customer.id },
                        omit: { customer_id: true, id: true, created_at: true, updated_at: true },
                        orderBy: [{ default_address: "desc" }, { created_at: orderBy }]
                    });

                    const totalRecords = await this.prisma.customerAddresses.count({ where: { customer_id: customer.id } });
                    const totalPages = Math.ceil(totalRecords / limit);

                    return {
                        data: addresses.map((address) => ({
                            uuid: address.uuid,
                            recipientName: address.recipient_name,
                            recipientLastName: address.recipient_last_name,
                            country: address.country,
                            state: address.state,
                            city: address.city,
                            locality: address.locality,
                            streetName: address.street_name,
                            neighborhood: address.neighborhood,
                            zipCode: address.zip_code,
                            addressType: address.address_type,
                            floor: address.floor,
                            number: address.number,
                            aditionalNumber: address.aditional_number,
                            referencesOrComments: address.references_or_comments,
                            countryPhoneCode: address.country_phone_code,
                            contactNumber: address.contact_number,
                            defaultAddress: address.default_address,
                        })),
                        totalRecords,
                        totalPages,
                        currentPage: page
                    };
                }
            })
        });
    };
};
