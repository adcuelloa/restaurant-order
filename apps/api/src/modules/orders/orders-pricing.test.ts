import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
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

describe("orders-pricing", () => {
  describe("validateAndComputeLineItems", () => {
    it("computes totalCents from base price only when no modifiers", () => {
      const itemMap1 = itemMap([{ id: "item1", priceCents: 1000 }]);
      const result = validateAndComputeLineItems(
        { items: [{ itemId: "item1", quantity: 2 }] },
        itemMap1
      );
      expect(result.totalCents).toBe(2000);
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0]).toEqual({
        itemId: "item1",
        quantity: 2,
      });
    });

    it("computes totalCents including modifier option prices (pricing logic)", () => {
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
      ],
    );
      const result = validateAndComputeLineItems(
        {
          items: [
            {
              itemId: "bowl",
              quantity: 1,
              modifierSelections: [
                { modifierGroupId: "protein", optionIds: ["beef"] },
                { modifierGroupId: "toppings", optionIds: ["cheese"] },
              ],
            },
          ],
        },
        itemMap1
      );
      expect(result.totalCents).toBe(1199 + 200 + 100);
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0]?.modifierSelections).toHaveLength(2);
    });

    it("throws when required modifier group has no selection", () => {
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
              options: [{ id: "chicken", name: "Chicken", priceCents: 0 }],
            },
          ],
        },
      ]);
      expect(() =>
        validateAndComputeLineItems(
          {
            items: [
              { itemId: "bowl", quantity: 1 },
            ],
          },
          itemMap1
        )
      ).toThrow(BadRequestException);
    });

    it("throws when required modifier group has more than one selection", () => {
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
          ],
        },
      ]);
      expect(() =>
        validateAndComputeLineItems(
          {
            items: [
              {
                itemId: "bowl",
                quantity: 1,
                modifierSelections: [
                  { modifierGroupId: "protein", optionIds: ["chicken", "beef"] },
                ],
              },
            ],
          },
          itemMap1
        )
      ).toThrow(BadRequestException);
    });

    it("throws when modifier group exceeds maxSelections (modifier max validation)", () => {
      const itemMap1 = itemMap([
        {
          id: "bowl",
          priceCents: 1199,
          modifierGroups: [
            {
              id: "toppings",
              name: "Toppings",
              required: false,
              maxSelections: 2,
              options: [
                { id: "a", name: "A", priceCents: 0 },
                { id: "b", name: "B", priceCents: 0 },
                { id: "c", name: "C", priceCents: 0 },
              ],
            },
          ],
        },
      ]);
      expect(() =>
        validateAndComputeLineItems(
          {
            items: [
              {
                itemId: "bowl",
                quantity: 1,
                modifierSelections: [
                  { modifierGroupId: "toppings", optionIds: ["a", "b", "c"] },
                ],
              },
            ],
          },
          itemMap1
        )
      ).toThrow(BadRequestException);
    });

    it("throws when optionId is not in modifier group", () => {
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
              options: [{ id: "chicken", name: "Chicken", priceCents: 0 }],
            },
          ],
        },
      ]);
      expect(() =>
        validateAndComputeLineItems(
          {
            items: [
              {
                itemId: "bowl",
                quantity: 1,
                modifierSelections: [
                  { modifierGroupId: "protein", optionIds: ["invalid"] },
                ],
              },
            ],
          },
          itemMap1
        )
      ).toThrow(BadRequestException);
    });
  });
});
