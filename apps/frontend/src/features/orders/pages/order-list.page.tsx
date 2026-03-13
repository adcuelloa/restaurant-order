import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { fetchOrders } from "../services/ordersService";
import type { OrderSummary } from "../services/ordersService";

function orderShortId(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8);
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type DateFilter = "all" | "today" | "week";

function getDateRange(filter: DateFilter): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  if (filter === "today") {
    return { dateFrom: today, dateTo: today };
  }
  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dateFrom = weekAgo.toISOString().slice(0, 10);
    return { dateFrom, dateTo: today };
  }
  return {};
}

export default function OrderListPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const { dateFrom, dateTo } = getDateRange(dateFilter);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["orders", dateFrom, dateTo],
    queryFn: () => fetchOrders({ dateFrom, dateTo, limit: 100 }),
  });

  const orders = data?.orders ?? [];
  const count = orders.length;

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <ErrorState
          title="Could not load orders"
          message={(error as Error).message}
          onRetry={() => refetch()}
          retryLabel="Retry"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {dateFilter === "today"
              ? "Orders placed today"
              : dateFilter === "week"
                ? "Last 7 days"
                : "All orders"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by date">
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("today")}
            aria-pressed={dateFilter === "today"}
          >
            Today
          </Button>
          <Button
            variant={dateFilter === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("week")}
            aria-pressed={dateFilter === "week"}
          >
            Last 7 days
          </Button>
          <Button
            variant={dateFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("all")}
            aria-pressed={dateFilter === "all"}
          >
            All
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Order list</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading…"
              : count === 0
                ? "No orders in this period"
                : `${count} order${count === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <p>No orders match the selected filter.</p>
              <Link to="/orders/new">
                <Button size="sm">Create an order</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-border divide-y" role="list" data-testid="order-list">
              {orders.map((order) => (
                <OrderRow key={order.orderId} order={order} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to="/orders/new">
          <Button>New order</Button>
        </Link>
        <Link to="/">
          <Button variant="outline">Back to menu</Button>
        </Link>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link
        to={`/orders/${order.orderId}`}
        className="hover:bg-muted/50 focus-visible:outline-ring flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-left no-underline transition-colors focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={`Order #${orderShortId(order.orderId)}, ${statusLabel(order.status)}, ${formatCurrency(order.totalCents)}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-medium tabular-nums">#{orderShortId(order.orderId)}</span>
          <span className="text-muted-foreground text-sm">
            {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{statusLabel(order.status)}</span>
          <span className="font-medium tabular-nums">{formatCurrency(order.totalCents)}</span>
        </div>
      </Link>
    </li>
  );
}
