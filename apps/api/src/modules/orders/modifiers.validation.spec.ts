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

describe("modifiers validation", () => {
  it("throws when user selects 2 proteins and exactly 1 is required", () => {
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
              { id: "tofu", name: "Tofu", priceCents: 0 },
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

    try {
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
      );
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as Error).message).toMatch(/exactly 1 selection/);
    }
  });

  it("throws when number of Toppings exceeds allowed maximum", () => {
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
                { modifierGroupId: "protein", optionIds: ["chicken"] },
                { modifierGroupId: "toppings", optionIds: ["a", "b", "c"] },
              ],
            },
          ],
        },
        itemMap1
      )
    ).toThrow(BadRequestException);

    try {
      validateAndComputeLineItems(
        {
          items: [
            {
              itemId: "bowl",
              quantity: 1,
              modifierSelections: [
                { modifierGroupId: "protein", optionIds: ["chicken"] },
                { modifierGroupId: "toppings", optionIds: ["a", "b", "c"] },
              ],
            },
          ],
        },
        itemMap1
      );
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as Error).message).toMatch(/at most 2 selection/);
    }
  });

  it("throws when number of Sauces exceeds allowed maximum", () => {
    const itemMap1 = itemMap([
      {
        id: "wrap",
        priceCents: 899,
        modifierGroups: [
          {
            id: "sauces",
            name: "Sauces",
            required: false,
            maxSelections: 3,
            options: [
              { id: "bbq", name: "BBQ", priceCents: 0 },
              { id: "mayo", name: "Mayo", priceCents: 0 },
              { id: "ranch", name: "Ranch", priceCents: 50 },
              { id: "hot", name: "Hot", priceCents: 0 },
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
              itemId: "wrap",
              quantity: 1,
              modifierSelections: [
                {
                  modifierGroupId: "sauces",
                  optionIds: ["bbq", "mayo", "ranch", "hot"],
                },
              ],
            },
          ],
        },
        itemMap1
      )
    ).toThrow(BadRequestException);

    try {
      validateAndComputeLineItems(
        {
          items: [
            {
              itemId: "wrap",
              quantity: 1,
              modifierSelections: [
                {
                  modifierGroupId: "sauces",
                  optionIds: ["bbq", "mayo", "ranch", "hot"],
                },
              ],
            },
          ],
        },
        itemMap1
      );
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as Error).message).toMatch(/at most 3 selection/);
    }
  });
});
