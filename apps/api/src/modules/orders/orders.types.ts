import { z } from "zod";

export const orderStatuses = [
  "draft",
  "submitted",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusSchema = z.enum(orderStatuses);

/** Valid transitions: submitted → confirmed → preparing → ready → completed; cancelled from draft | submitted */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["preparing"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

const modifierSelectionSchema = z.object({
  modifierGroupId: z.string().min(1),
  optionIds: z.array(z.string().min(1)),
});

const createOrderItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
  modifierSelections: z.array(modifierSelectionSchema).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(createOrderItemSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusSchema>;
