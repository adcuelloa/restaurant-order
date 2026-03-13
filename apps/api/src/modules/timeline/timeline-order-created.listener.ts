import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { TimelineService } from "./timeline.service";

export interface OrderCreatedPayload {
  orderId: string;
  status: string;
  totalCents: number;
  occurredAt: Date;
  correlationId?: string;
}

const MOCK_USER_ID = "mock-user";

/** Async listener: appends ORDER_PLACED to timeline. Does not block HTTP response. */
@Injectable()
export class TimelineOrderCreatedListener {
  constructor(@Inject(TimelineService) private readonly timelineService: TimelineService) {}

  @OnEvent("order.created")
  async handle(payload: OrderCreatedPayload): Promise<void> {
    await this.timelineService.appendEvent({
      orderId: payload.orderId,
      type: "ORDER_PLACED",
      source: "worker",
      correlationId: payload.correlationId ?? payload.orderId,
      userId: MOCK_USER_ID,
      payload: {
        orderId: payload.orderId,
        status: payload.status,
        totalCents: payload.totalCents,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  }
}
