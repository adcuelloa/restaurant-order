import { describe, it, expect } from "vitest";
import { assertValidStatusTransition } from "./orders.transitions";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "./orders.types";

describe("Order status transitions", () => {
  const validTransitions: Array<[OrderStatus, OrderStatus]> = [
    ["draft", "submitted"],
    ["draft", "cancelled"],
    ["submitted", "confirmed"],
    ["submitted", "cancelled"],
    ["confirmed", "preparing"],
    ["preparing", "ready"],
    ["ready", "completed"],
  ];

  it.each(validTransitions)("allows %s -> %s", (from, to) => {
    expect(() => assertValidStatusTransition(from, to)).not.toThrow();
  });

  it("rejects invalid transition submitted -> completed", () => {
    expect(() => assertValidStatusTransition("submitted", "completed")).toThrow(
      /Invalid status transition from submitted to completed/
    );
  });

  it("rejects invalid transition completed -> cancelled", () => {
    expect(() => assertValidStatusTransition("completed", "cancelled")).toThrow(
      /Invalid status transition/
    );
  });

  it("rejects transition from terminal status completed", () => {
    expect(() => assertValidStatusTransition("completed", "ready")).toThrow(
      /Invalid status transition/
    );
  });

  it("ORDER_STATUS_TRANSITIONS has no next states for completed and cancelled", () => {
    expect(ORDER_STATUS_TRANSITIONS.completed).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});
