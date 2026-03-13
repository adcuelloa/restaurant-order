import { BadRequestException } from "@nestjs/common";
import type { CreateOrderDTO } from "./orders.types";

export interface ItemWithModifiers {
  _id: unknown;
  priceCents: number;
  modifierGroups?: Array<{
    id: string;
    name: string;
    required: boolean;
    maxSelections: number;
    options: Array<{ id: string; name: string; priceCents?: number }>;
  }>;
}

export interface LineItemResult {
  itemId: string;
  quantity: number;
  modifierSelections?: Array<{ modifierGroupId: string; optionIds: string[] }>;
}

/**
 * Validates modifier selections (required, maxSelections, valid optionIds) and
 * computes totalCents (base + modifier option prices) per line. Throws BadRequestException on validation failure.
 */
export function validateAndComputeLineItems(
  dto: CreateOrderDTO,
  itemMap: Map<string, ItemWithModifiers>
): { lineItems: LineItemResult[]; totalCents: number } {
  let totalCents = 0;
  const lineItems: LineItemResult[] = [];

  for (const line of dto.items) {
    const item = itemMap.get(line.itemId);
    if (!item) {
      throw new BadRequestException(`Item not found: ${line.itemId}`);
    }

    const modifierSelections = line.modifierSelections ?? [];
    const groups = item.modifierGroups ?? [];

    for (const group of groups) {
      const sel = modifierSelections.find((s) => s.modifierGroupId === group.id);
      const optionIds = sel?.optionIds ?? [];

      if (group.required && optionIds.length !== 1) {
        throw new BadRequestException(
          `Item ${line.itemId}: modifier group "${group.name}" (${group.id}) is required and must have exactly 1 selection`
        );
      }
      if (optionIds.length > group.maxSelections) {
        throw new BadRequestException(
          `Item ${line.itemId}: modifier group "${group.name}" (${group.id}) allows at most ${group.maxSelections} selection(s)`
        );
      }
      const validIds = new Set(group.options.map((o) => o.id));
      for (const id of optionIds) {
        if (!validIds.has(id)) {
          throw new BadRequestException(
            `Item ${line.itemId}: invalid option "${id}" for modifier group "${group.id}"`
          );
        }
      }
    }

    let linePriceCents = item.priceCents;
    for (const group of groups) {
      const sel = modifierSelections.find((s) => s.modifierGroupId === group.id);
      for (const optionId of sel?.optionIds ?? []) {
        const opt = group.options.find((o) => o.id === optionId);
        if (opt) linePriceCents += opt.priceCents ?? 0;
      }
    }
    totalCents += linePriceCents * line.quantity;

    lineItems.push({
      itemId: line.itemId,
      quantity: line.quantity,
      ...(modifierSelections.length > 0 && { modifierSelections }),
    });
  }

  return { lineItems, totalCents };
}
