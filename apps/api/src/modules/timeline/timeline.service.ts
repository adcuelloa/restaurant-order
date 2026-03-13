import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import {
  OrderTimelineEvent,
  TIMELINE_PAYLOAD_MAX_BYTES,
  type OrderTimelineEventDocument,
  type TimelineEventType,
  type TimelineSource,
} from "./schemas/order-timeline-event.schema";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface AppendEventInput {
  orderId: string;
  type: TimelineEventType;
  source: TimelineSource;
  correlationId: string;
  userId: string;
  payload: Record<string, unknown>;
  eventId?: string;
}

export interface TimelineEventDTO {
  eventId: string;
  timestamp: string;
  orderId: string;
  userId: string;
  type: string;
  source: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface TimelinePageQuery {
  pageSize?: number;
  cursor?: string;
}

export interface TimelinePageResult {
  events: TimelineEventDTO[];
  nextCursor: string | null;
}

@Injectable()
export class TimelineService {
  constructor(
    @InjectModel(OrderTimelineEvent.name)
    private readonly eventModel: Model<OrderTimelineEventDocument>
  ) {}

  private payloadSizeBytes(payload: Record<string, unknown>): number {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  }

  /** Append-only: insert one event. Deduplicate by eventId. Payload max 16KB. */
  async appendEvent(input: AppendEventInput): Promise<string> {
    const payloadSize = this.payloadSizeBytes(input.payload);
    if (payloadSize > TIMELINE_PAYLOAD_MAX_BYTES) {
      throw new BadRequestException(
        `Timeline payload exceeds ${TIMELINE_PAYLOAD_MAX_BYTES / 1024}KB limit`
      );
    }

    const eventId = input.eventId ?? randomUUID();
    const timestamp = new Date();

    const existing = await this.eventModel
      .findOne({ eventId })
      .lean()
      .exec();
    if (existing) {
      return eventId;
    }

    await this.eventModel.create({
      eventId,
      timestamp,
      orderId: input.orderId,
      userId: input.userId,
      type: input.type,
      source: input.source,
      correlationId: input.correlationId,
      payload: input.payload,
    });

    return eventId;
  }

  /** Get timeline for order. Sorted by timestamp asc. Pagination: pageSize <= 50. */
  async findByOrderId(
    orderId: string,
    query: TimelinePageQuery = {}
  ): Promise<TimelinePageResult> {
    const pageSize = Math.min(
      Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );

    const filter: { orderId: string; eventId?: { $gt: string } } = { orderId };
    if (query.cursor) {
      filter.eventId = { $gt: query.cursor };
    }

    const docs = await this.eventModel
      .find(filter)
      .sort({ timestamp: 1, eventId: 1 })
      .limit(pageSize + 1)
      .lean()
      .exec();

    const hasMore = docs.length > pageSize;
    const slice = hasMore ? docs.slice(0, pageSize) : docs;
    const nextCursor =
      hasMore && slice.length > 0
        ? (slice[slice.length - 1] as { eventId: string }).eventId
        : null;

    const events: TimelineEventDTO[] = slice.map((d) => {
      const doc = d as {
        eventId: string;
        timestamp: Date;
        orderId: string;
        userId: string;
        type: string;
        source: string;
        correlationId: string;
        payload: Record<string, unknown>;
      };
      return {
        eventId: doc.eventId,
        timestamp: doc.timestamp.toISOString(),
        orderId: doc.orderId,
        userId: doc.userId,
        type: doc.type,
        source: doc.source,
        correlationId: doc.correlationId,
        payload: doc.payload,
      };
    });

    return { events, nextCursor };
  }
}
