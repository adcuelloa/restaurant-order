import { describe, it, expect } from "vitest";
import {
  idempotencyOrdersKey,
  orderTimelineCacheKey,
  IDEMPOTENCY_ORDERS_TTL_SEC,
} from "./redis-keys";

describe("redis-keys", () => {
  describe("idempotencyOrdersKey", () => {
    it("returns key with prefix and idempotency key", () => {
      expect(idempotencyOrdersKey("abc-123")).toBe("idempotency:orders:abc-123");
      expect(idempotencyOrdersKey("")).toBe("idempotency:orders:");
    });
  });

  describe("orderTimelineCacheKey", () => {
    it("returns key with order id", () => {
      expect(orderTimelineCacheKey("ord-1")).toBe("timeline:orders:ord-1");
    });
  });

  it("IDEMPOTENCY_ORDERS_TTL_SEC is 24h in seconds", () => {
    expect(IDEMPOTENCY_ORDERS_TTL_SEC).toBe(86400);
  });
});
