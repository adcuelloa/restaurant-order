import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { TimelineService } from "./timeline.service";

export interface OrderStatusChangedPayload {
  orderId: string;
  status: string;
  previousStatus: string;
  totalCents: number;
  occurredAt: Date;
}

const MOCK_USER_ID = "mock-user";

/** Async listener: appends ORDER_STATUS_CHANGED to timeline. */
@Injectable()
export class TimelineOrderStatusListener {
  constructor(@Inject(TimelineService) private readonly timelineService: TimelineService) {}

  @OnEvent("order.status_changed")
  async handle(payload: OrderStatusChangedPayload): Promise<void> {
    await this.timelineService.appendEvent({
      orderId: payload.orderId,
      type: "ORDER_STATUS_CHANGED",
      source: "worker",
      correlationId: payload.orderId,
      userId: MOCK_USER_ID,
      payload: {
        orderId: payload.orderId,
        status: payload.status,
        previousStatus: payload.previousStatus,
        totalCents: payload.totalCents,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  }
}
