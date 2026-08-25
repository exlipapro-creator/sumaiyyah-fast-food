export type OrderStatus = "completed" | "voided";

export type FulfillmentStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "voided";

export interface StateTransitionResult {
  allowed: boolean;
  error?: string;
}

const ALLOWED_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "completed", "cancelled"],
  out_for_delivery: ["delivered", "completed", "cancelled"],
  delivered: ["completed"],
  completed: ["voided"],
  cancelled: [],
  voided: [],
};

export const TERMINAL_STATUSES: FulfillmentStatus[] = ["cancelled", "voided", "completed"];

export function canTransitionFulfillment(
  current: FulfillmentStatus,
  next: FulfillmentStatus,
  userRole: "manager" | "cashier" = "cashier"
): StateTransitionResult {
  if (current === next) {
    return { allowed: true };
  }

  // Once an order is in a terminal cancelled or voided state, no further status updates are permitted
  if (current === "cancelled" || current === "voided") {
    return {
      allowed: false,
      error: `Order is already ${current} and cannot be modified.`,
    };
  }

  // Managers have override capability to transition between active phases, but still cannot resurrect cancelled/voided
  if (userRole === "manager") {
    if (next === "voided") {
      return { allowed: true };
    }
    const validStatuses: FulfillmentStatus[] = [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "completed",
      "cancelled",
      "voided",
    ];
    if (validStatuses.includes(next)) {
      return { allowed: true };
    }
  }

  const allowedNext = ALLOWED_TRANSITIONS[current] || [];
  if (allowedNext.includes(next)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `Cannot transition from "${current}" to "${next}". Allowed: ${allowedNext.join(", ") || "none"}`,
  };
}
