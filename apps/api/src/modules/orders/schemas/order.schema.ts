import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import type { OrderStatus } from "../orders.types";

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItemModifierSelection {
  @Prop({ required: true, type: String })
  modifierGroupId!: string;

  @Prop({ type: [String], required: true })
  optionIds!: string[];
}

export const OrderItemModifierSelectionSchema = SchemaFactory.createForClass(OrderItemModifierSelection);

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true, type: String })
  itemId!: string;

  @Prop({ required: true, type: Number })
  quantity!: number;

  @Prop({ type: [OrderItemModifierSelectionSchema], default: undefined })
  modifierSelections?: OrderItemModifierSelection[];
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, type: String })
  orderId!: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: Array<{ itemId: string; quantity: number }>;

  @Prop({ required: true, type: Number })
  totalCents!: number;

  @Prop({ required: true, type: String })
  status!: OrderStatus;

  @Prop({ default: Date.now, type: Date })
  createdAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
