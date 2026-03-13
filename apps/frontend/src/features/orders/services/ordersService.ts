import api from "@/services/api";

export interface CreateOrderItem {
  itemId: string;
  quantity: number;
  modifierSelections?: Array<{ modifierGroupId: string; optionIds: string[] }>;
}

export interface Order {
  orderId: string;
  items: CreateOrderItem[];
  totalCents: number;
  status: string;
  createdAt?: string;
  allowedNextStatuses?: string[];
}

export interface TimelineEvent {
  eventId: string;
  /** ISO 8601 time when the event occurred (authoritative). */
  occurredAt: string;
  timestamp: string;
  orderId: string;
  userId: string;
  type: string;
  source: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface TimelinePage {
  events: TimelineEvent[];
  nextCursor: string | null;
}

export interface CreateOrderResponse {
  orderId: string;
}

export interface OrderSummary {
  orderId: string;
  status: string;
  totalCents: number;
  createdAt: string;
}

export interface OrdersListResponse {
  orders: OrderSummary[];
}

export async function fetchOrders(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  limit?: number;
}): Promise<OrdersListResponse> {
  const { data } = await api.get<OrdersListResponse>("/orders", {
    params: {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      status: params?.status,
      limit: params?.limit,
    },
  });
  return data;
}

export async function createOrder(
  items: CreateOrderItem[],
  idempotencyKey: string
): Promise<CreateOrderResponse> {
  const { data } = await api.post<CreateOrderResponse>(
    "/orders",
    { items },
    {
      headers: { "Idempotency-Key": idempotencyKey },
    }
  );
  return data;
}

export async function fetchOrder(orderId: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${orderId}`);
  return data;
}

export async function fetchOrderTimeline(
  orderId: string,
  params?: { pageSize?: number; cursor?: string }
): Promise<TimelinePage> {
  const { data } = await api.get<TimelinePage>(`/orders/${orderId}/timeline`, {
    params: { pageSize: params?.pageSize ?? 50, cursor: params?.cursor },
  });
  return data;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${orderId}`, { status });
  return data;
}
