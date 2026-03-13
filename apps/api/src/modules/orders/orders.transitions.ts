import { BadRequestException } from "@nestjs/common";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "./orders.types";

export function assertValidStatusTransition(from: OrderStatus, to: OrderStatus): void {
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new BadRequestException(`Invalid status transition from ${from} to ${to}`);
  }
}
