/**
 * Central Redis key builder. No hardcoded key strings in services.
 * TTL for idempotency: 24h (86400s).
 */

export const IDEMPOTENCY_ORDERS_TTL_SEC = 86400; // 24h

export function idempotencyOrdersKey(idempotencyKey: string): string {
  return `idempotency:orders:${idempotencyKey}`;
}

/** Optional cache key for order timeline (e.g. TTL 60s). */
export function orderTimelineCacheKey(orderId: string): string {
  return `timeline:orders:${orderId}`;
}
