import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Item, ItemSchema } from "./schemas/item.schema";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";
import { MenuController } from "./menu.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }])],
  controllers: [ItemsController, MenuController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
