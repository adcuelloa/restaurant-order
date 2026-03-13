import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import { RedisService } from "../../common/redis/redis.service";
import { idempotencyOrdersKey, IDEMPOTENCY_ORDERS_TTL_SEC } from "../../common/redis-keys";
import { ORDER_STATUS_TRANSITIONS, type CreateOrderDTO, type OrderStatus } from "./orders.types";
import { assertValidStatusTransition } from "./orders.transitions";
import { validateAndComputeLineItems } from "./orders-pricing";
import type { ItemWithModifiers } from "./orders-pricing";
import { Order, type OrderDocument } from "./schemas/order.schema";
import { Item, type ItemDocument } from "../items/schemas/item.schema";

const INITIAL_ORDER_STATUS: OrderStatus = "submitted";

/** HTTP 202 Accepted per spec: order is processed asynchronously. */
const ORDER_ACCEPTED_STATUS = 202;

export { assertValidStatusTransition };

export interface OrderRequestedPayload {
  orderId: string;
  idempotencyKey: string;
  dto: CreateOrderDTO;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Validates payload and items, then returns 202 Accepted with orderId.
   * Order is created asynchronously by OrderRequestedListener.
   */
  async create(
    idempotencyKey: string,
    dto: CreateOrderDTO
  ): Promise<{ statusCode: number; body: Record<string, unknown> }> {
    const redisKey = idempotencyOrdersKey(idempotencyKey);
    const cached = await this.redis.getJson<{
      statusCode: number;
      body: Record<string, unknown>;
    }>(redisKey);
    if (cached) {
      return cached;
    }

    const itemIds = dto.items.map((i) => i.itemId);
    const items = await this.itemModel
      .find({ _id: { $in: itemIds } })
      .lean()
      .exec();

    const itemMap = new Map<string, ItemWithModifiers>(
      items.map((doc) => [String((doc as { _id: unknown })._id), doc as ItemWithModifiers])
    );

    validateAndComputeLineItems(dto, itemMap);

    const orderId = randomUUID();
    const body = { orderId };

    await this.redis.setJson(
      redisKey,
      { statusCode: ORDER_ACCEPTED_STATUS, body },
      IDEMPOTENCY_ORDERS_TTL_SEC
    );

    this.eventEmitter.emit("order.requested", {
      orderId,
      idempotencyKey,
      dto,
    });

    return { statusCode: ORDER_ACCEPTED_STATUS, body };
  }

  /** Called by worker: creates order in DB and emits order.created for timeline. */
  async processOrderRequested(payload: OrderRequestedPayload): Promise<void> {
    const { orderId, dto } = payload;

    const itemIds = dto.items.map((i) => i.itemId);
    const items = await this.itemModel
      .find({ _id: { $in: itemIds } })
      .lean()
      .exec();

    const itemMap = new Map<string, ItemWithModifiers>(
      items.map((doc) => [String((doc as { _id: unknown })._id), doc as ItemWithModifiers])
    );

    const { lineItems, totalCents } = validateAndComputeLineItems(dto, itemMap);

    await this.orderModel.create({
      orderId,
      items: lineItems,
      totalCents,
      status: INITIAL_ORDER_STATUS,
    });

    const occurredAt = new Date();
    this.eventEmitter.emit("order.created", {
      orderId,
      status: INITIAL_ORDER_STATUS,
      totalCents,
      occurredAt,
      correlationId: orderId,
    });
  }

  /** List orders with optional date range and status filter. Newest first. */
  async findMany(params: {
    dateFrom?: string;
    dateTo?: string;
    status?: OrderStatus;
    limit?: number;
  }): Promise<{
    orders: Array<{
      orderId: string;
      status: OrderStatus;
      totalCents: number;
      createdAt: string;
    }>;
  }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const filter: Record<string, unknown> = {};
    if (params.dateFrom || params.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (params.dateFrom) dateFilter.$gte = new Date(params.dateFrom);
      if (params.dateTo) {
        const to = new Date(params.dateTo);
        to.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      }
      filter.createdAt = dateFilter;
    }
    if (params.status) {
      filter.status = params.status;
    }
    const docs = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("orderId status totalCents createdAt")
      .lean()
      .exec();
    return {
      orders: (docs as Array<{ orderId: string; status: OrderStatus; totalCents: number; createdAt: Date }>).map(
        (d) => ({
          orderId: d.orderId,
          status: d.status,
          totalCents: d.totalCents,
          createdAt: d.createdAt.toISOString(),
        })
      ),
    };
  }

  async getById(orderId: string): Promise<{
    orderId: string;
    items: Array<{
      itemId: string;
      quantity: number;
      modifierSelections?: Array<{ modifierGroupId: string; optionIds: string[] }>;
    }>;
    totalCents: number;
    status: OrderStatus;
    createdAt: string;
    allowedNextStatuses: OrderStatus[];
  }> {
    const doc = await this.orderModel.findOne({ orderId }).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }
    const d = doc as {
      orderId: string;
      items: Array<{
        itemId: string;
        quantity: number;
        modifierSelections?: Array<{ modifierGroupId: string; optionIds: string[] }>;
      }>;
      totalCents: number;
      status: OrderStatus;
      createdAt: Date;
    };
    const allowedNext = ORDER_STATUS_TRANSITIONS[d.status] ?? [];
    return {
      orderId: d.orderId,
      items: d.items,
      totalCents: d.totalCents,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      allowedNextStatuses: allowedNext,
    };
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<{
    orderId: string;
    items: Array<{ itemId: string; quantity: number }>;
    totalCents: number;
    status: OrderStatus;
    createdAt: string;
  }> {
    const doc = await this.orderModel.findOne({ orderId }).exec();
    if (!doc) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }
    const currentStatus = doc.status as OrderStatus;
    assertValidStatusTransition(currentStatus, newStatus);

    doc.status = newStatus;
    await doc.save();

    const occurredAt = new Date();
    this.eventEmitter.emit("order.status_changed", {
      orderId,
      status: newStatus,
      previousStatus: currentStatus,
      totalCents: doc.totalCents,
      occurredAt,
    });

    return this.getById(orderId);
  }
}
