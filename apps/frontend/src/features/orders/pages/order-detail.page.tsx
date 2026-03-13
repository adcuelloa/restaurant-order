import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { Skeleton } from "@/components/feedback/Skeleton";
import { fetchMenu } from "@/features/items/services/menuService";
import type { MenuItemDTO } from "@/features/items/services/menuService";
import { fetchOrder, fetchOrderTimeline, updateOrderStatus } from "../services/ordersService";
import type { CreateOrderItem, TimelineEvent } from "../services/ordersService";

/** Short order reference (first 8 chars) for display. */
function orderShortId(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8);
}

/** Human-readable status label. */
function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/** Format date/time for display. */
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Format currency (cents → USD). */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Build itemId → menu item and optionId → name maps from menu categories. */
function buildMenuMaps(menuItems: MenuItemDTO[]) {
  const itemById = new Map<string, MenuItemDTO>();
  const optionNameById = new Map<string, string>();
  for (const item of menuItems) {
    itemById.set(item.id, item);
    for (const group of item.modifierGroups ?? []) {
      for (const opt of group.options) {
        optionNameById.set(opt.id, opt.name);
      }
    }
  }
  return { itemById, optionNameById };
}

/** Display name for an order line (item name or fallback to id). */
function lineItemName(
  line: CreateOrderItem,
  itemById: Map<string, MenuItemDTO>
): string {
  return itemById.get(line.itemId)?.name ?? line.itemId;
}

/** Human-readable modifier summary for a line. */
function lineModifierSummary(
  line: CreateOrderItem,
  optionNameById: Map<string, string>
): string {
  if (!line.modifierSelections?.length) return "";
  const names: string[] = [];
  for (const sel of line.modifierSelections) {
    for (const optId of sel.optionIds) {
      const name = optionNameById.get(optId);
      if (name) names.push(name);
    }
  }
  return names.join(", ");
}

/** Human-readable timeline event title. */
function timelineEventTitle(evt: TimelineEvent): string {
  switch (evt.type) {
    case "ORDER_PLACED":
      return "Order placed";
    case "ORDER_STATUS_CHANGED": {
      const status = (evt.payload?.status as string) ?? "";
      return status ? `Status: ${statusLabel(status)}` : "Status changed";
    }
    default:
      return evt.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/** Short summary of timeline payload for display (no raw JSON). */
function timelinePayloadSummary(evt: TimelineEvent): string | null {
  const p = evt.payload;
  if (!p || typeof p !== "object") return null;
  const parts: string[] = [];
  if (typeof p.status === "string") {
    parts.push(statusLabel(p.status));
    if (typeof p.previousStatus === "string") {
      parts.push(`(was ${statusLabel(p.previousStatus)})`);
    }
  }
  if (typeof p.totalCents === "number") {
    parts.push(formatCurrency(p.totalCents));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = id ?? "";
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  });

  const { data: menuData } = useQuery({
    queryKey: ["menu"],
    queryFn: () => fetchMenu(),
    enabled: !!orderId && !!order,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["order-timeline", orderId],
    queryFn: () => fetchOrderTimeline(orderId),
    enabled: !!orderId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", orderId] });
    },
  });

  if (!orderId) {
    return (
      <ErrorState
        message="No order ID provided."
        secondaryAction={
          <Link to="/">
            <Button variant="outline" size="sm">
              Back to menu
            </Button>
          </Link>
        }
      />
    );
  }

  if (orderLoading || !order) {
    return (
      <div className="space-y-6" data-testid="order-detail-loading">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          <LoadingSpinner className="size-4" aria-label="Loading order" />
          <span className="text-sm">Loading order…</span>
        </div>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Order</h1>
        </div>
        <ErrorState
          title="Could not load order"
          message={(orderError as Error).message}
          onRetry={() => refetchOrder()}
          retryLabel="Retry"
          secondaryAction={
            <Link to="/">
              <Button variant="outline" size="sm">
                Back to menu
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const menuItems = menuData?.categories?.flatMap((c) => c.items) ?? [];
  const { itemById, optionNameById } = buildMenuMaps(menuItems);
  const allowed = order.allowedNextStatuses ?? [];
  const events = timeline?.events ?? [];
  const hasTimeline = events.length > 0;
  const shortId = orderShortId(order.orderId);
  const createdAt = order.createdAt
    ? formatDateTime(order.createdAt)
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header: order ref, status, total */}
      <header className="space-y-3">
        <div
          className="flex flex-wrap items-center gap-3"
          data-testid="order-detail-header"
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            Order #{shortId}
          </h1>
          <Badge
            variant="secondary"
            className="font-medium"
            aria-label={`Status: ${order.status}`}
          >
            {statusLabel(order.status)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {createdAt ? (
            <>Placed on {createdAt}</>
          ) : (
            <>Order ID: {order.orderId}</>
          )}
        </p>
        <p className="text-xl font-semibold tabular-nums">
          Total: {formatCurrency(order.totalCents)}
        </p>
      </header>

      {/* Next status actions */}
      {allowed.length > 0 ? (
        <section aria-label="Change status">
          <p className="text-muted-foreground mb-2 text-sm">
            Update status
          </p>
          <div className="flex flex-wrap gap-2" role="group">
            {allowed.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => statusMutation.mutate(s)}
                disabled={statusMutation.isPending}
                aria-busy={statusMutation.isPending}
                aria-label={`Mark order as ${statusLabel(s)}`}
              >
                Mark as {statusLabel(s)}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>What you ordered</CardDescription>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items in this order.</p>
          ) : (
            <ul className="space-y-3" role="list">
              {order.items.map((line, i) => {
                const name = lineItemName(line, itemById);
                const modSummary = lineModifierSummary(line, optionNameById);
                return (
                  <li
                    key={`${line.itemId}-${i}-${line.quantity}`}
                    className="border-border flex flex-col gap-0.5 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {name} × {line.quantity}
                    </span>
                    {modSummary ? (
                      <span className="text-muted-foreground text-xs">
                        With: {modSummary}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Status history</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <LoadingSpinner className="size-4" aria-label="Loading timeline" />
              <span className="text-sm">Loading timeline…</span>
            </div>
          ) : hasTimeline ? (
            <ol
              className="relative space-y-4 border-l-2 border-border pl-4"
              role="list"
              data-testid="order-timeline-events"
              aria-label="Order timeline"
            >
              {events.map((evt) => {
                const title = timelineEventTitle(evt);
                const summary = timelinePayloadSummary(evt);
                return (
                  <li
                    key={evt.eventId}
                    className="relative pl-2"
                    aria-label={`${title}${summary ? ` — ${summary}` : ""}`}
                  >
                    <span
                      className="bg-background absolute -left-5.5 top-0 size-3 rounded-full border-2 border-border"
                      aria-hidden
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{title}</span>
                      <span
                        className="text-muted-foreground text-xs"
                        suppressHydrationWarning
                      >
                        {formatDateTime(evt.timestamp)}
                      </span>
                      {summary ? (
                        <span className="text-muted-foreground text-sm">
                          {summary}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              title="No timeline events yet"
              description="Status changes will appear here."
            />
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <nav className="flex flex-wrap gap-2" aria-label="Order actions">
        <Link to="/">
          <Button variant="outline">Back to menu</Button>
        </Link>
        <Link to="/orders/new">
          <Button>New order</Button>
        </Link>
      </nav>
    </div>
  );
}
