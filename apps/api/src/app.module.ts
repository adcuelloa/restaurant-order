import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { databaseConfig } from "./config";
import { RedisModule } from "./common/redis/redis.module";
import { HealthModule } from "./modules/health/health.module";
import { ItemsModule } from "./modules/items/items.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { TimelineModule } from "./modules/timeline/timeline.module";

@Module({
  imports: [
    MongooseModule.forRoot(databaseConfig.url),
    EventEmitterModule.forRoot(),
    RedisModule,
    HealthModule,
    ItemsModule,
    OrdersModule,
    TimelineModule,
  ],
})
export class AppModule {}
