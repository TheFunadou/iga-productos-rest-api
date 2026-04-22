import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShippingDTO, UpdateShippingDTO } from './application/DTO/shipping.dto';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CreateShippingByApprovedOrderI, ShippingDashboardI } from './application/interfaces/shipping.interfaces';
import { OrdersDashboardParams } from 'src/orders/payment/application/DTO/order.dto';

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);
    private readonly nodeEnv: string;
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly config: ConfigService
    ) {
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
    };

    async create({ dto }: { dto: CreateShippingDTO }) {
        const { orderUUID } = dto;

    };


    async createShippingByApprovedOrder(args: { tx: Prisma.TransactionClient, orderId: string, dto: CreateShippingByApprovedOrderI }) {
        const { tx, dto, orderId } = args;
        const shippingInfo = await tx.orderShippingInfo.findUnique({
            where: { order_id: orderId },
            select: { id: true }
        });
        if (!shippingInfo) throw new NotFoundException("No se encontro la informacion de envio de esta orden");


        await tx.shipping.create({
            data: {
                order_id: orderId,
                order_shipping_info_id: shippingInfo.id,
                concept: dto.concept,
                boxes_count: dto.boxesCount,
                shipping_status: dto.shippingStatus,
                shipping_amount: dto.shippingAmount,
            }
        });
    };


    async dashboard({ query }: { query: OrdersDashboardParams }) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const orderBy = query.orderby ?? "asc";
        const uuid = query.uuid;
        const skip = (page - 1) * limit;
        let where: Prisma.ShippingWhereInput = {};
        if (uuid) where = { order: { uuid } };

        return await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "shipping:dashboard",
            query: uuid ? { limit, page, orderBy, uuid } : { limit, page, orderBy },
            aditionalOptions: {
                ttlMilliseconds: 1000 * 60 * 15,
                staleTimeMilliseconds: 1000 * 60 * 12
            },
            fallback: async () => {
                const data = await this.prisma.shipping.findMany({
                    where,
                    orderBy: { created_at: orderBy },
                    skip,
                    take: limit,
                    omit: {
                        id: true,
                        order_id: true,
                    },
                    include: {
                        order: { select: { uuid: true } },
                    }
                });

                const totalRecords = await this.prisma.shipping.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                const response: ShippingDashboardI = {
                    data: data.map((shipping) => ({
                        uuid: shipping.uuid,
                        orderUUID: shipping.order.uuid,
                        shippingStatus: shipping.shipping_status,
                        concept: shipping.concept,
                        carrier: shipping.carrier,
                        trackingNumber: shipping.tracking_number,
                        shippingAmount: shipping.shipping_amount.toString(),
                        insuranceAmount: shipping.insurance_amount?.toString(),
                        boxesCount: shipping.boxes_count,
                        shippedAt: shipping.shipped_at,
                        deliveredAt: shipping.delivered_at,
                        createdAt: shipping.created_at,
                        updatedAt: shipping.updated_at
                    })),
                    totalRecords,
                    totalPages,
                    currentPage: page
                };
                return response;
            }
        })
    };

    async updateShipping({ dto }: { dto: UpdateShippingDTO }) {
        const { uuid, ...data } = dto;
        try {
            await this.prisma.shipping.update({ where: { uuid }, data });
        } catch (error) {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar la orden de envio");
            throw new BadRequestException("Error al actualizar la orden de envio");
        }

        return `Orden de envio ${uuid} actualizada satisfactoriamente`;
    };


};
