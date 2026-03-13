import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ZodUpdatePipe,
  ZodValidationPipe,
} from "../../common/pipes/zod-validation.pipe";
import {
  createItemSchema,
  listItemsQuerySchema,
  updateItemSchema,
  type CreateItemDTO,
  type UpdateItemDTO,
} from "./items.types";
import { ItemsService } from "./items.service";

@Controller("api/v1/items")
export class ItemsController {
  constructor(@Inject(ItemsService) private readonly itemsService: ItemsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listItemsQuerySchema)) query: { limit: number; offset: number }
  ) {
    return this.itemsService.findAll(query);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createItemSchema))
    body: CreateItemDTO
  ) {
    return this.itemsService.create(body);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodUpdatePipe(updateItemSchema))
    body: UpdateItemDTO
  ) {
    return this.itemsService.update(id, body);
  }
}
