import { describe, it, expect } from "vitest";
import {
  createItemSchema,
  updateItemSchema,
  listItemsQuerySchema,
} from "./items.types";

describe("Items Zod schemas", () => {
  describe("createItemSchema", () => {
    it("accepts valid item", () => {
      const valid = {
        name: "Pizza",
        description: "Margherita",
        priceCents: 1200,
      };
      expect(createItemSchema.parse(valid)).toEqual({
        ...valid,
        categoryId: "main",
      });
    });

    it("defaults description to empty string", () => {
      expect(
        createItemSchema.parse({ name: "Pizza", priceCents: 1000 })
      ).toEqual({
        name: "Pizza",
        description: "",
        priceCents: 1000,
        categoryId: "main",
      });
    });

    it("rejects negative priceCents", () => {
      expect(() =>
        createItemSchema.parse({ name: "Pizza", priceCents: -1 })
      ).toThrow();
    });

    it("rejects empty name", () => {
      expect(() =>
        createItemSchema.parse({ name: "", priceCents: 100 })
      ).toThrow();
    });

    it("rejects non-integer priceCents", () => {
      expect(() =>
        createItemSchema.parse({ name: "Pizza", priceCents: 10.5 })
      ).toThrow();
    });
  });

  describe("updateItemSchema", () => {
    it("accepts partial update with only description", () => {
      expect(
        updateItemSchema.parse({ description: "Updated" })
      ).toEqual({ description: "Updated" });
    });

    it("accepts partial update with name and priceCents", () => {
      expect(
        updateItemSchema.parse({ name: "New Name", priceCents: 999 })
      ).toEqual({ name: "New Name", priceCents: 999 });
    });

    it("rejects negative priceCents", () => {
      expect(() => updateItemSchema.parse({ priceCents: -1 })).toThrow();
    });
  });

  describe("listItemsQuerySchema", () => {
    it("defaults limit and offset", () => {
      expect(listItemsQuerySchema.parse({})).toEqual({
        limit: 20,
        offset: 0,
      });
    });

    it("coerces string numbers", () => {
      expect(
        listItemsQuerySchema.parse({ limit: "10", offset: "5" })
      ).toEqual({ limit: 10, offset: 5 });
    });

    it("rejects limit > 100", () => {
      expect(() => listItemsQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it("rejects negative offset", () => {
      expect(() => listItemsQuerySchema.parse({ offset: -1 })).toThrow();
    });
  });
});
