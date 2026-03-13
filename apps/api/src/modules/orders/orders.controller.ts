import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { IdempotencyGuard } from "./guards/idempotency.guard";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  type OrderStatus,
  orderStatusSchema,
} from "./orders.types";
import { OrdersService } from "./orders.service";
import {
  TimelineService,
  type TimelinePageQuery,
} from "../timeline/timeline.service";

@Controller("api/v1/orders")
export class OrdersController {
  constructor(
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(TimelineService) private readonly timelineService: TimelineService
  ) {}

  @Post()
  @UseGuards(IdempotencyGuard)
  async create(
    @Req() req: Request & { idempotencyKey?: string },
    @Body(new ZodValidationPipe(createOrderSchema))
    body: { items: Array<{ itemId: string; quantity: number }> },
    @Res() res: Response
  ): Promise<void> {
    const idempotencyKey = req.idempotencyKey ?? "";
    const { statusCode, body: responseBody } = await this.ordersService.create(
      idempotencyKey,
      body
    );
    res.status(statusCode).json(responseBody);
  }

  @Get()
  async list(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("status") status?: string,
    @Query("limit") limitStr?: string
  ) {
    const limit = limitStr != null ? parseInt(limitStr, 10) : undefined;
    const parsedStatus =
      status != null && status !== "" ? orderStatusSchema.safeParse(status) : null;
    return this.ordersService.findMany({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: parsedStatus?.success ? parsedStatus.data : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Get(":id/timeline")
  async getTimeline(
    @Param("id") orderId: string,
    @Query("pageSize") pageSize?: string,
    @Query("cursor") cursor?: string
  ) {
    const query: TimelinePageQuery = {};
    if (pageSize != null) {
      const n = parseInt(pageSize, 10);
      if (!Number.isNaN(n)) query.pageSize = n;
    }
    if (cursor != null && cursor !== "") query.cursor = cursor;
    return this.timelineService.findByOrderId(orderId, query);
  }

  @Get(":id")
  async getById(@Param("id") orderId: string) {
    return this.ordersService.getById(orderId);
  }

  @Patch(":id")
  async updateStatus(
    @Param("id") orderId: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema))
    body: { status: OrderStatus }
  ) {
    return this.ordersService.updateStatus(orderId, body.status);
  }
}
