import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import type { OrderStatus } from "./orders.types";

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

describe("OrdersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns cached response when idempotency key exists (202 + orderId)", async () => {
      const cached = {
        statusCode: 202,
        body: { orderId: "cached-1" },
      };
      mockRedis.getJson.mockResolvedValue(cached);

      const service = createService();
      const result = await service.create("same-key", {
        items: [{ itemId: "item1", quantity: 1 }],
      });

      expect(result).toEqual(cached);
      expect(mockRedis.getJson).toHaveBeenCalledWith("idempotency:orders:same-key");
      expect(mockOrderModel.create).not.toHaveBeenCalled();
    });

    it("returns 202 Accepted with orderId and emits order.requested when key is new", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockItemModel.find.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([
            { _id: "item1", priceCents: 500 },
          ]),
        }),
      });

      const service = createService();
      const result = await service.create("new-key", {
        items: [{ itemId: "item1", quantity: 2 }],
      });

      expect(result.statusCode).toBe(202);
      expect(result.body).toMatchObject({ orderId: expect.any(String) });
      expect(result.body.orderId).toBeDefined();
      expect(mockRedis.setJson).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "order.requested",
        expect.objectContaining({
          orderId: result.body.orderId,
          idempotencyKey: "new-key",
          dto: { items: [{ itemId: "item1", quantity: 2 }] },
        })
      );
      expect(mockOrderModel.create).not.toHaveBeenCalled();
    });

    it("throws when item not found", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockItemModel.find.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      });

      const service = createService();
      await expect(
        service.create("key", { items: [{ itemId: "missing", quantity: 1 }] })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getById", () => {
    it("returns order with allowedNextStatuses", async () => {
      const doc = {
        orderId: "ord-1",
        items: [{ itemId: "i1", quantity: 1 }],
        totalCents: 100,
        status: "submitted" as OrderStatus,
        createdAt: new Date("2025-01-01"),
      };
      mockOrderModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(doc),
        }),
      });

      const service = createService();
      const result = await service.getById("ord-1");

      expect(result.orderId).toBe("ord-1");
      expect(result.status).toBe("submitted");
      expect(result.allowedNextStatuses).toEqual(["confirmed", "cancelled"]);
      expect(result.createdAt).toBe("2025-01-01T00:00:00.000Z");
    });

    it("throws NotFoundException when order not found", async () => {
      mockOrderModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(null),
        }),
      });

      const service = createService();
      await expect(service.getById("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStatus", () => {
    it("updates status and returns order when transition is valid", async () => {
      const doc = {
        orderId: "ord-1",
        status: "submitted",
        totalCents: 100,
        save: vi.fn().mockResolvedValue(undefined),
      };
      const savedDoc = {
        ...doc,
        status: "confirmed",
        createdAt: new Date("2025-01-02"),
        items: [],
      };
      mockOrderModel.findOne
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(doc),
        })
        .mockReturnValueOnce({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(savedDoc),
          }),
        });

      const service = createService();
      const result = await service.updateStatus("ord-1", "confirmed");

      expect(doc.status).toBe("confirmed");
      expect(doc.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "order.status_changed",
        expect.objectContaining({
          orderId: "ord-1",
          status: "confirmed",
          previousStatus: "submitted",
        })
      );
      expect(result.status).toBe("confirmed");
    });

    it("throws when order not found", async () => {
      mockOrderModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const service = createService();
      await expect(
        service.updateStatus("missing", "confirmed")
      ).rejects.toThrow(NotFoundException);
    });

    it("throws when transition is invalid", async () => {
      const doc = {
        orderId: "ord-1",
        status: "submitted",
        totalCents: 100,
        save: vi.fn(),
      };
      mockOrderModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(doc),
      });

      const service = createService();
      await expect(
        service.updateStatus("ord-1", "completed")
      ).rejects.toThrow(BadRequestException);
    });
  });
});
