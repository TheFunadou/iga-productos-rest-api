import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShippingDTO, GetShippingDashboard } from './shipping.dto';
import { Decimal } from '@prisma/client/runtime/client';
import { OrdersDashboardParams } from 'src/orders/order.dto';

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { };

    async createShippingByApprovedOrder(args: { tx?: any, orderId: string, dto: CreateShippingDTO }) {
        const shippingCost = 264.00; //Mexican pesos
        const { tx } = args;
        const order = args.tx ? await args.tx.order.findUnique({
            where: { id: args.orderId },
            select: { id: true, order_items: { select: { quantity: true } } }
        }) : await this.prisma.order.findUnique({
            where: { id: args.orderId },
            select: { id: true, order_items: { select: { quantity: true } } }
        });
        if (!order) throw new NotFoundException("Orden no encontrada");
        const totalItems = order.order_items.reduce((acc, item) => acc + item.quantity, 0);
        const boxesQty = Math.ceil(totalItems / 10);
        const shipping_amount = new Decimal(shippingCost * boxesQty)
        const created = tx ? await tx.shipping.create({
            data: { order_id: order.id, ...args.dto, boxes_count: boxesQty, shipping_amount }
        }) : await this.prisma.shipping.create({
            data: { order_id: order.id, ...args.dto, boxes_count: boxesQty, shipping_amount }
        });
        this.logger.log(`Envio creado con UUID: ${created.uuid}`);
    };

    async create(args: { tx?: any, dto: CreateShippingDTO }) {
        const shippingCost = 264.00; //Mexican pesos
        const { tx } = args;
        if (!args.dto.uuid) throw new BadRequestException("Se necesita proveer un UUID de orden");
        const order = args.tx ? await args.tx.order.findUnique({
            where: { uuid: args.dto.uuid },
            select: { id: true, order_items: { select: { quantity: true } } }
        }) : await this.prisma.order.findUnique({
            where: { uuid: args.dto.uuid },
            select: { id: true, order_items: { select: { quantity: true } } }
        });
        if (!order) throw new NotFoundException("Orden no encontrada");
        const totalItems = order.order_items.reduce((acc, item) => acc + item.quantity, 0);
        const boxesQty = Math.ceil(totalItems / 10);
        const shipping_amount = new Decimal(shippingCost * boxesQty)
        const created = tx ? await tx.shipping.create({
            data: { order_id: order.id, ...args.dto, boxes_count: boxesQty, shipping_amount }
        }) : await this.prisma.shipping.create({
            data: { order_id: order.id, ...args.dto, boxes_count: boxesQty, shipping_amount }
        });
        const message = `Envio creado con UUID: ${created.uuid}`;
        this.logger.log(message);
        return message;
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

};
