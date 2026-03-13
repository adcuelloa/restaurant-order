import { describe, it, expect } from "vitest";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderStatusSchema,
} from "./orders.types";

describe("Orders Zod schemas", () => {
  describe("createOrderSchema", () => {
    it("accepts valid create order payload", () => {
      const valid = { items: [{ itemId: "id1", quantity: 2 }] };
      expect(createOrderSchema.parse(valid)).toEqual(valid);
    });

    it("rejects empty items", () => {
      expect(() => createOrderSchema.parse({ items: [] })).toThrow();
    });

    it("rejects missing items", () => {
      expect(() => createOrderSchema.parse({})).toThrow();
    });

    it("rejects quantity < 1", () => {
      expect(() =>
        createOrderSchema.parse({ items: [{ itemId: "a", quantity: 0 }] })
      ).toThrow();
    });

    it("rejects invalid itemId", () => {
      expect(() =>
        createOrderSchema.parse({ items: [{ itemId: "", quantity: 1 }] })
      ).toThrow();
    });
  });

  describe("updateOrderStatusSchema", () => {
    it("accepts all valid statuses", () => {
      const statuses = [
        "draft",
        "submitted",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ] as const;
      for (const status of statuses) {
        expect(updateOrderStatusSchema.parse({ status })).toEqual({ status });
      }
    });

    it("rejects invalid status", () => {
      expect(() => updateOrderStatusSchema.parse({ status: "invalid" })).toThrow();
    });
  });

  describe("orderStatusSchema", () => {
    it("parses valid status string", () => {
      expect(orderStatusSchema.parse("submitted")).toBe("submitted");
    });

    it("rejects invalid status", () => {
      expect(() => orderStatusSchema.parse("pending")).toThrow();
    });
  });
});
