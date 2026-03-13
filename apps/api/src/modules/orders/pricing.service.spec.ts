import { describe, it, expect } from "vitest";
import {
  validateAndComputeLineItems,
  type ItemWithModifiers,
} from "./orders-pricing";

function itemMap(
  entries: Array<{
    id: string;
    priceCents: number;
    modifierGroups?: ItemWithModifiers["modifierGroups"];
  }>
): Map<string, ItemWithModifiers> {
  const map = new Map<string, ItemWithModifiers>();
  for (const e of entries) {
    map.set(e.id, {
      _id: e.id,
      priceCents: e.priceCents,
      modifierGroups: e.modifierGroups,
    });
  }
  return map;
}

describe("pricing.service", () => {
  describe("server ignores client total and computes from DB", () => {
    it("ignores any total sent in payload and calculates total from base prices + modifiers (integer cents)", () => {
      const itemMap1 = itemMap([
        {
          id: "bowl",
          priceCents: 1199,
          modifierGroups: [
            {
              id: "protein",
              name: "Protein",
              required: true,
              maxSelections: 1,
              options: [
                { id: "chicken", name: "Chicken", priceCents: 0 },
                { id: "beef", name: "Beef", priceCents: 200 },
              ],
            },
            {
              id: "toppings",
              name: "Toppings",
              required: false,
              maxSelections: 2,
              options: [
                { id: "lettuce", name: "Lettuce", priceCents: 0 },
                { id: "cheese", name: "Cheese", priceCents: 100 },
              ],
            },
          ],
        },
      ]);

      // Client could send total in payload; server must ignore it and compute from DB
      const dtoWithClientTotal = {
        items: [
          {
            itemId: "bowl",
            quantity: 2,
            modifierSelections: [
              { modifierGroupId: "protein", optionIds: ["beef"] },
              { modifierGroupId: "toppings", optionIds: ["cheese"] },
            ],
          },
        ],
        total: 999999,
        totalCents: 999999,
      } as Parameters<typeof validateAndComputeLineItems>[0] & {
        total?: number;
        totalCents?: number;
      };

      const result = validateAndComputeLineItems(dtoWithClientTotal, itemMap1);

      // Server must use base (1199) + beef (200) + cheese (100) = 1499 per unit × 2 = 2998
      const expectedCents = (1199 + 200 + 100) * 2;
      expect(result.totalCents).toBe(expectedCents);
      expect(result.totalCents).not.toBe(999999);
      expect(Number.isInteger(result.totalCents)).toBe(true);
    });

    it("returns integer cents when only base price (no modifiers)", () => {
      const itemMap1 = itemMap([{ id: "item1", priceCents: 1099 }]);
      const result = validateAndComputeLineItems(
        { items: [{ itemId: "item1", quantity: 3 }] },
        itemMap1
      );
      expect(result.totalCents).toBe(3297);
      expect(Number.isInteger(result.totalCents)).toBe(true);
    });

    it("returns integer cents when modifiers have fractional-looking prices (stored as int cents)", () => {
      const itemMap1 = itemMap([
        {
          id: "item1",
          priceCents: 1000,
          modifierGroups: [
            {
              id: "extra",
              name: "Extra",
              required: false,
              maxSelections: 1,
              options: [{ id: "add", name: "Add", priceCents: 50 }],
            },
          ],
        },
      ]);
      const result = validateAndComputeLineItems(
        {
          items: [
            {
              itemId: "item1",
              quantity: 1,
              modifierSelections: [{ modifierGroupId: "extra", optionIds: ["add"] }],
            },
          ],
        },
        itemMap1
      );
      expect(result.totalCents).toBe(1050);
      expect(Number.isInteger(result.totalCents)).toBe(true);
    });
  });
});
