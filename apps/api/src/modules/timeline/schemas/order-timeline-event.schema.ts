import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OrderTimelineEventDocument = HydratedDocument<OrderTimelineEvent>;

/** Timeline event types per spec. */
export const TIMELINE_EVENT_TYPES = [
  "CART_ITEM_ADDED",
  "CART_ITEM_UPDATED",
  "CART_ITEM_REMOVED",
  "PRICING_CALCULATED",
  "ORDER_PLACED",
  "ORDER_STATUS_CHANGED",
  "VALIDATION_FAILED",
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const TIMELINE_SOURCES = ["api", "worker", "ui"] as const;
export type TimelineSource = (typeof TIMELINE_SOURCES)[number];

/** Max payload size in bytes (16KB per spec). */
export const TIMELINE_PAYLOAD_MAX_BYTES = 16 * 1024;

/** Append-only. No updates or deletes. Deduplicate by eventId. */
@Schema({ collection: "order_timeline_events", timestamps: false })
export class OrderTimelineEvent {
  @Prop({ required: true, unique: true, type: String })
  eventId!: string;

  @Prop({ required: true, type: Date })
  timestamp!: Date;

  @Prop({ required: true, index: true, type: String })
  orderId!: string;

  @Prop({ required: true, type: String })
  userId!: string;

  @Prop({ required: true, type: String, enum: TIMELINE_EVENT_TYPES })
  type!: TimelineEventType;

  @Prop({ required: true, type: String, enum: TIMELINE_SOURCES })
  source!: TimelineSource;

  @Prop({ required: true, type: String })
  correlationId!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;
}

export const OrderTimelineEventSchema =
  SchemaFactory.createForClass(OrderTimelineEvent);

OrderTimelineEventSchema.index({ orderId: 1, timestamp: 1 });
