import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardGridSkeleton } from "@/components/feedback/Skeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { fetchMenu } from "@/features/items/services/menuService";
import type { MenuItemDTO, ModifierGroupDTO } from "@/features/items/services/menuService";
import { createOrder } from "../services/ordersService";
import type { CreateOrderItem } from "../services/ordersService";

/** Flatten all items from menu categories. */
function allMenuItems(categories: { items: MenuItemDTO[] }[]): MenuItemDTO[] {
  return categories.flatMap((c) => c.items);
}

/** Modifier selections per item: itemId -> modifierGroupId -> optionIds. */
type ModifierSelectionsMap = Record<string, Record<string, string[]>>;

/** Compare two lines for merging (same item + same modifier selections). */
function sameLine(a: CreateOrderItem, b: CreateOrderItem): boolean {
  if (a.itemId !== b.itemId) return false;
  const modsA = a.modifierSelections ?? [];
  const modsB = b.modifierSelections ?? [];
  if (modsA.length !== modsB.length) return false;
  const key = (m: { modifierGroupId: string; optionIds: string[] }) =>
    `${m.modifierGroupId}:${m.optionIds.slice().sort().join(",")}`;
  const setA = new Set(modsA.map(key));
  return modsB.every((m) => setA.has(key(m)));
}

/** Human-readable modifier summary for a line (option names from menu). */
function getLineModifierSummary(
  line: CreateOrderItem,
  menuItems: MenuItemDTO[]
): string {
  const item = menuItems.find((i) => i.id === line.itemId);
  if (!item?.modifierGroups?.length || !line.modifierSelections?.length) return "";
  const parts: string[] = [];
  for (const sel of line.modifierSelections) {
    const group = item.modifierGroups.find((g) => g.id === sel.modifierGroupId);
    if (!group) continue;
    for (const optId of sel.optionIds) {
      const opt = group.options.find((o) => o.id === optId);
      if (opt) parts.push(opt.name);
    }
  }
  return parts.join(", ");
}

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const {
    data: menuData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["menu"],
    queryFn: () => fetchMenu(),
  });
  const [orderLines, setOrderLines] = useState<CreateOrderItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modifierSelections, setModifierSelections] = useState<ModifierSelectionsMap>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (idempotencyKey: string) => createOrder(orderLines, idempotencyKey),
    onSuccess: (res) => {
      navigate(`/orders/${res.orderId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    createMutation.mutate(crypto.randomUUID());
  };

  const updateQty = (itemId: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
    setAddError(null);
  };

  const updateModifier = (itemId: string, groupId: string, optionIds: string[]) => {
    setModifierSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? {}),
        [groupId]: optionIds,
      },
    }));
    setAddError(null);
  };

  const toggleOption = (itemId: string, group: ModifierGroupDTO, optionId: string) => {
    const current = modifierSelections[itemId]?.[group.id] ?? [];
    const isSelected = current.includes(optionId);
    if (group.required && group.maxSelections === 1) {
      updateModifier(itemId, group.id, isSelected ? [] : [optionId]);
      return;
    }
    if (isSelected) {
      updateModifier(
        itemId,
        group.id,
        current.filter((id) => id !== optionId)
      );
    } else if (current.length < group.maxSelections) {
      updateModifier(itemId, group.id, [...current, optionId]);
    }
  };

  const handleAddToOrder = (item: MenuItemDTO) => {
    const qty = quantities[item.id] ?? 0;
    if (qty < 1) {
      setAddError(`Set quantity for ${item.name} before adding.`);
      return;
    }
    const { valid, missingRequired } = validateItemForAdd(item, modifierSelections[item.id]);
    if (!valid) {
      setAddError(`Select required options for ${item.name}: ${missingRequired.join(", ")}`);
      return;
    }
    setAddError(null);
    const mods = modifierSelections[item.id];
    const modifierSelectionsPayload =
      mods && Object.keys(mods).length > 0
        ? Object.entries(mods).map(([modifierGroupId, optionIds]) => ({
            modifierGroupId,
            optionIds,
          }))
        : undefined;
    const newLine: CreateOrderItem = {
      itemId: item.id,
      quantity: qty,
      ...(modifierSelectionsPayload?.length ? { modifierSelections: modifierSelectionsPayload } : {}),
    };
    setOrderLines((prev) => {
      const existing = prev.findIndex((l) => sameLine(l, newLine));
      if (existing >= 0) {
        const next = prev.slice();
        next[existing] = {
          ...next[existing],
          quantity: next[existing].quantity + newLine.quantity,
        };
        return next;
      }
      return [...prev, newLine];
    });
    setQuantities((prev) => ({ ...prev, [item.id]: 0 }));
  };

  const removeLine = (index: number) => {
    setOrderLines((prev) => prev.filter((_, i) => i !== index));
  };

  const categories = menuData?.categories ?? [];
  const menuItems = categories.length > 0 ? allMenuItems(categories) : [];
  const query = searchQuery.trim().toLowerCase();
  const filteredCategories = query
    ? categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : categories;
  const canSubmit = orderLines.length > 0 && !createMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create Order</h1>
          <p className="text-muted-foreground">
            Add items to your order, then review and submit.
          </p>
        </div>
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create Order</h1>
        </div>
        <ErrorState
          title="Could not load menu"
          message={(error as Error).message}
          onRetry={() => refetch()}
          retryLabel="Reload menu"
        />
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create Order</h1>
          <p className="text-muted-foreground">Add items to your order, then review and submit.</p>
        </div>
        <EmptyState
          title="No menu items yet"
          description="Run the API seed script or add items to see the menu."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reload menu
              </Button>
              <Link to="/">
                <Button variant="secondary" size="sm">
                  Back to menu
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create Order</h1>
        <p className="text-muted-foreground">
          Choose quantity and options (e.g. protein, toppings), then click &quot;Add to order&quot;.
          Review your order below and submit when ready.
        </p>
      </div>

      {/* Order summary: visible when there are lines */}
      {orderLines.length > 0 ? (
        <Card data-testid="order-summary">
          <CardHeader>
            <CardTitle>Your order</CardTitle>
            <CardDescription>Review before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2" role="list">
              {orderLines.map((line, index) => {
                const item = menuItems.find((i) => i.id === line.itemId);
                const name = item?.name ?? line.itemId;
                const summary = getLineModifierSummary(line, menuItems);
                return (
                  <li
                    key={`${line.itemId}-${index}-${line.quantity}-${JSON.stringify(line.modifierSelections ?? [])}`}
                    className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span>
                      <strong>{name}</strong> × {line.quantity}
                      {summary ? (
                        <span className="text-muted-foreground"> — {summary}</span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                      aria-label={`Remove ${name} from order`}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }}
              disabled={!canSubmit}
              aria-busy={createMutation.isPending}
              data-testid="submit-order-btn"
            >
              {createMutation.isPending ? "Submitting…" : "Submit order"}
            </Button>
            {createMutation.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {(createMutation.error as Error).message}
              </p>
            ) : null}
          </CardFooter>
        </Card>
      ) : null}

      {addError ? (
        <p className="text-destructive text-sm" role="alert">
          {addError}
        </p>
      ) : null}

      <form data-testid="create-order-form" onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="menu-search" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="menu-search"
            type="search"
            placeholder="Search by name or description…"
            aria-label="Search dishes or drinks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <section key={category.id} aria-labelledby={`category-${category.id}`}>
              <h2
                id={`category-${category.id}`}
                className="text-foreground mb-3 text-lg font-semibold tracking-tight"
              >
                {category.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.items.map((item) => (
                  <Card key={item.id} data-slot="card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription>
                        {(item.priceCents / 100).toFixed(2)} USD
                        {item.modifierGroups && item.modifierGroups.length > 0
                          ? " (customizable)"
                          : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`qty-${item.id}`} className="text-sm font-medium">
                          Quantity
                        </label>
                        <Input
                          id={`qty-${item.id}`}
                          type="number"
                          min={0}
                          aria-label={`Quantity for ${item.name}`}
                          className="w-20"
                          value={quantities[item.id] ?? 0}
                          onChange={(e) =>
                            updateQty(item.id, parseInt(e.target.value, 10) || 0)
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddToOrder(item)}
                          data-testid={`add-to-order-${item.id}`}
                        >
                          Add to order
                        </Button>
                      </div>

                      {item.modifierGroups &&
                        item.modifierGroups.length > 0 &&
                        item.modifierGroups.map((group) => (
                          <div key={group.id} className="space-y-1.5">
                            <span className="text-sm font-medium">
                              {group.name}
                              {group.required ? " (required)" : ""}
                              {group.maxSelections > 1
                                ? ` — up to ${group.maxSelections}`
                                : ""}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {group.options.map((opt) => {
                                const selected = (
                                  modifierSelections[item.id]?.[group.id] ?? []
                                ).includes(opt.id);
                                const isRadio = group.required && group.maxSelections === 1;
                                return (
                                  <label
                                    key={opt.id}
                                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                                  >
                                    <input
                                      type={isRadio ? "radio" : "checkbox"}
                                      name={
                                        group.required
                                          ? `mod-${item.id}-${group.id}`
                                          : undefined
                                      }
                                      checked={selected}
                                      onChange={() => toggleOption(item.id, group, opt.id)}
                                      className="border-border rounded"
                                    />
                                    {opt.name}
                                    {opt.priceCents > 0 ? (
                                      <span className="text-muted-foreground">
                                        (+{(opt.priceCents / 100).toFixed(2)})
                                      </span>
                                    ) : null}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {orderLines.length > 0 ? null : (
          <p className="text-muted-foreground text-sm">
            Add at least one item to your order above; the summary will appear at the top.
          </p>
        )}
      </form>
    </div>
  );
}

/** Validate one item's current selection for adding (required modifiers). */
function validateItemForAdd(
  item: MenuItemDTO,
  selections: Record<string, string[]> | undefined
): { valid: boolean; missingRequired: string[] } {
  const missingRequired: string[] = [];
  const groups = item.modifierGroups ?? [];
  for (const group of groups) {
    if (!group.required) continue;
    const selected = selections?.[group.id] ?? [];
    if (selected.length !== 1) {
      missingRequired.push(group.name);
    }
  }
  return { valid: missingRequired.length === 0, missingRequired };
}
