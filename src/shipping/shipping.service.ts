import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShippingDTO, GetShippingDashboard, UpdateShippingDTO } from './shipping.dto';
import { Decimal } from '@prisma/client/runtime/client';
import { OrdersDashboardParams } from 'src/orders/order.dto';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { SHIPPING_COST } from 'src/orders/helpers/order.helpers';

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

    async createShippingByApprovedOrder(args: { tx: Prisma.TransactionClient, orderId: string, dto: CreateShippingDTO, shippingInfoId: string }) {
        const { tx, shippingInfoId } = args;
        const order = await tx.order.findUnique({
            where: { id: args.orderId },
            select: { id: true, order_items: { select: { quantity: true } } }
        });
        if (!order) throw new NotFoundException("Orden no encontrada");
        const totalItems = order.order_items.reduce((acc, item) => acc + item.quantity, 0);
        const boxesQty = Math.ceil(totalItems / 10);
        const shipping_amount = new Decimal(SHIPPING_COST * boxesQty)
        await tx.shipping.create({
            data: { order_id: order.id, ...args.dto, boxes_count: boxesQty, shipping_amount, order_shipping_info_id: shippingInfoId }
        });
    };


    async dashboard({ query: { limit, page, orderby, uuid } }: { query: OrdersDashboardParams }) {
        const skip = (page - 1) * limit;
        const orderBy = orderby || "asc";
        let where = {};
        if (uuid) where = { order: { uuid } };

        return await this.cache.remember({
            method: "staleWhileRevalidateWithLock",
            entity: "shipping:dashboard",
            query: uuid ? { limit, page, orderby, uuid } : { limit, page, orderby },
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
                        order: { select: { uuid: true } }
                    }
                });

                const totalRecords = await this.prisma.shipping.count({ where });
                const totalPages = Math.ceil(totalRecords / limit);
                const response: GetShippingDashboard = {
                    data: data.map((shipping) => ({
                        ...shipping,
                        order_uuid: shipping.order.uuid,
                        shipping_amount: shipping.shipping_amount.toString(),
                        insurance_amount: shipping.insurance_amount?.toString()
                    })),
                    totalRecords,
                    totalPages
                };
                return response;
            }
        })
    };

    async updateShipping({ dto }: { dto: UpdateShippingDTO }) {
        const { uuid, ...data } = dto;
        const shippingOrder = this.prisma.shipping.findMany({ where: { uuid } });
        if (!shippingOrder) throw new NotFoundException("Orden de envio no encontrada");

        await this.prisma.shipping.update({
            where: { uuid: dto.uuid }, data
        }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al actualizar la orden de envio");
            throw new BadRequestException("Error al actualizar la orden de envio");
        });

        return `Orden de envio ${uuid} actualizada satisfactoriamente`;
    };

};
