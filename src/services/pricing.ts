import type { CouponType, OrderStatus } from "@prisma/client";

export type CouponLike = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotalCents: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export type CouponResult = { ok: true; discountCents: number } | { ok: false; reason: string };

/** Pure coupon validation + discount calculation (unit-tested). */
export function evaluateCoupon(coupon: CouponLike | null, subtotalCents: number, now = new Date()): CouponResult {
  if (!coupon || !coupon.isActive) return { ok: false, reason: "Invalid coupon code" };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: "This coupon is not active yet" };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: "This coupon has expired" };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: "This coupon has reached its usage limit" };
  if (subtotalCents < coupon.minSubtotalCents) return { ok: false, reason: "Order does not meet the minimum amount for this coupon" };
  const raw = coupon.type === "PERCENTAGE" ? Math.floor((subtotalCents * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.max(0, Math.min(raw, subtotalCents)) };
}

export type ShippingConfig = {
  shippingFlatCents: number;
  expressShippingCents: number;
  freeShippingOverCents: number;
  taxRateBps: number;
};

export function computeShipping(method: "standard" | "express", subtotalAfterDiscountCents: number, cfg: ShippingConfig): number {
  if (method === "express") return cfg.expressShippingCents;
  if (cfg.freeShippingOverCents > 0 && subtotalAfterDiscountCents >= cfg.freeShippingOverCents) return 0;
  return cfg.shippingFlatCents;
}

export function computeTotals(subtotalCents: number, discountCents: number, method: "standard" | "express", cfg: ShippingConfig) {
  const taxable = Math.max(0, subtotalCents - discountCents);
  const shippingCents = taxable === 0 ? 0 : computeShipping(method, taxable, cfg);
  const taxCents = Math.round((taxable * cfg.taxRateBps) / 10_000);
  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents: taxable + shippingCents + taxCents };
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Customers may cancel only before fulfilment starts. */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED";
}
