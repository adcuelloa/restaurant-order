import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "./schemas/order.schema";
import { Item, ItemSchema } from "../items/schemas/item.schema";
import { TimelineModule } from "../timeline/timeline.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderRequestedListener } from "./order-requested.listener";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Item.name, schema: ItemSchema },
    ]),
    TimelineModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRequestedListener],
  exports: [OrdersService],
})
export class OrdersModule {}
