import { describe, expect, it } from "vitest";
import { canTransition, computeTotals, customerCanCancel, evaluateCoupon, type CouponLike, type ShippingConfig } from "@/services/pricing";

const base: CouponLike = { code: "X", type: "PERCENTAGE", value: 10, minSubtotalCents: 0, usageLimit: null, usedCount: 0, startsAt: null, expiresAt: null, isActive: true };
const cfg: ShippingConfig = { shippingFlatCents: 799, expressShippingCents: 1999, freeShippingOverCents: 10000, taxRateBps: 825 };

describe("coupon validation", () => {
  it("rejects unknown and disabled coupons", () => {
    expect(evaluateCoupon(null, 5000).ok).toBe(false);
    expect(evaluateCoupon({ ...base, isActive: false }, 5000).ok).toBe(false);
  });
  it("applies percentage discounts, rounding down", () => {
    expect(evaluateCoupon(base, 9999)).toEqual({ ok: true, discountCents: 999 });
  });
  it("caps fixed discounts at the subtotal", () => {
    expect(evaluateCoupon({ ...base, type: "FIXED", value: 5000 }, 3000)).toEqual({ ok: true, discountCents: 3000 });
  });
  it("enforces expiry, start date, usage limit and minimum", () => {
    const now = new Date("2026-06-01");
    expect(evaluateCoupon({ ...base, expiresAt: new Date("2026-05-01") }, 5000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, startsAt: new Date("2026-07-01") }, 5000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, usageLimit: 3, usedCount: 3 }, 5000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, minSubtotalCents: 10000 }, 5000, now).ok).toBe(false);
    expect(evaluateCoupon({ ...base, minSubtotalCents: 5000 }, 5000, now).ok).toBe(true);
  });
});

describe("totals", () => {
  it("charges flat shipping below the free threshold", () => {
    expect(computeTotals(5000, 0, "standard", cfg)).toMatchObject({ shippingCents: 799, taxCents: 413, totalCents: 5000 + 799 + 413 });
  });
  it("gives free standard shipping at or above the threshold (after discount)", () => {
    expect(computeTotals(10000, 0, "standard", cfg).shippingCents).toBe(0);
    expect(computeTotals(10000, 1000, "standard", cfg).shippingCents).toBe(799);
  });
  it("always charges express", () => {
    expect(computeTotals(50000, 0, "express", cfg).shippingCents).toBe(1999);
  });
  it("never goes negative", () => {
    expect(computeTotals(1000, 5000, "standard", cfg).totalCents).toBe(0);
  });
});

describe("order status machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });
  it("blocks skipping and reviving terminal states", () => {
    expect(canTransition("PENDING", "SHIPPED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("REFUNDED", "DELIVERED")).toBe(false);
  });
  it("lets customers cancel only before fulfilment", () => {
    expect(customerCanCancel("PENDING")).toBe(true);
    expect(customerCanCancel("CONFIRMED")).toBe(true);
    expect(customerCanCancel("PROCESSING")).toBe(false);
    expect(customerCanCancel("SHIPPED")).toBe(false);
  });
});
