import { Injectable, Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { OrderRequestedPayload } from "./orders.service";
import { OrdersService } from "./orders.service";

/** Async worker: creates order in DB and emits order.created for timeline. */
@Injectable()
export class OrderRequestedListener {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @OnEvent("order.requested")
  async handle(payload: OrderRequestedPayload): Promise<void> {
    await this.ordersService.processOrderRequested(payload);
  }
}
