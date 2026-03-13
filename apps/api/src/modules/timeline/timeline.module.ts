import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  OrderTimelineEvent,
  OrderTimelineEventSchema,
} from "./schemas/order-timeline-event.schema";
import { TimelineService } from "./timeline.service";
import { TimelineOrderCreatedListener } from "./timeline-order-created.listener";
import { TimelineOrderStatusListener } from "./timeline-order-status.listener";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderTimelineEvent.name, schema: OrderTimelineEventSchema },
    ]),
  ],
  providers: [TimelineService, TimelineOrderCreatedListener, TimelineOrderStatusListener],
  exports: [TimelineService],
})
export class TimelineModule {}
