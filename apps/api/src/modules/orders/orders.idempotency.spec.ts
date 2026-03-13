import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrdersService } from "./orders.service";
import { idempotencyOrdersKey } from "../../common/redis-keys";

const mockOrderModel = {
  findOne: vi.fn(),
  create: vi.fn(),
};
const mockItemModel = {
  find: vi.fn(),
};
const mockRedis = {
  getJson: vi.fn(),
  setJson: vi.fn(),
};
const mockEventEmitter = {
  emit: vi.fn(),
};

function createService(): OrdersService {
  return new OrdersService(
    mockOrderModel as never,
    mockItemModel as never,
    mockRedis as never,
    mockEventEmitter as never
  );
}

describe("orders idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /orders: same Idempotency-Key twice returns cached 202 without re-running checkout, DB, or events", async () => {
    const idempotencyKey = "idem-key-123";
    const dto = { items: [{ itemId: "item1", quantity: 2 }] };

    // First request: cache miss
    mockRedis.getJson.mockResolvedValueOnce(null);
    mockItemModel.find.mockReturnValue({
      lean: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { _id: "item1", priceCents: 500 },
        ]),
      }),
    });

    const service = createService();
    const first = await service.create(idempotencyKey, dto);

    expect(first.statusCode).toBe(202);
    expect(first.body).toMatchObject({ orderId: expect.any(String) });
    expect(mockRedis.getJson).toHaveBeenCalledWith(idempotencyOrdersKey(idempotencyKey));
    expect(mockRedis.setJson).toHaveBeenCalledWith(
      idempotencyOrdersKey(idempotencyKey),
      { statusCode: 202, body: first.body },
      expect.any(Number)
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "order.requested",
      expect.objectContaining({ idempotencyKey, dto, orderId: first.body.orderId })
    );
    expect(mockOrderModel.create).not.toHaveBeenCalled();

    // Second request: same key -> cache hit
    const cachedResponse = { statusCode: 202, body: first.body };
    mockRedis.getJson.mockResolvedValueOnce(cachedResponse);

    const second = await service.create(idempotencyKey, dto);

    expect(second).toEqual(cachedResponse);
    expect(second.statusCode).toBe(202);
    expect(second.body.orderId).toBe(first.body.orderId);

    // Second request must NOT execute checkout logic, DB, or events
    expect(mockItemModel.find).toHaveBeenCalledTimes(1); // only on first request
    expect(mockOrderModel.create).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1); // still 1 from first request
    expect(mockRedis.setJson).toHaveBeenCalledTimes(1); // only on first request
  });
});
