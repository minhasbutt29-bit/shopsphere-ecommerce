import { describe, expect, it } from "vitest";
import { addressSchema, checkoutSchema, couponSchema, passwordSchema, productSchema, profileSchema, registerSchema } from "@/validation/schemas";

describe("registration", () => {
  const valid = { name: "Ada Lovelace", email: "ADA@Example.com", password: "Str0ngPassword" };
  it("normalises email", () => {
    expect(registerSchema.parse(valid).email).toBe("ada@example.com");
  });
  it("silently strips a client-supplied role (no privilege escalation)", () => {
    const parsed = registerSchema.parse({ ...valid, role: "ADMIN" }) as Record<string, unknown>;
    expect(parsed.role).toBeUndefined();
  });
  it("rejects weak passwords", () => {
    for (const p of ["short1A", "alllowercase123", "ALLUPPERCASE123", "NoDigitsHereAtAll"]) expect(passwordSchema.safeParse(p).success).toBe(false);
  });
});

describe("profile update", () => {
  it("cannot carry role, email or isActive through", () => {
    const parsed = profileSchema.parse({ name: "Ada", role: "ADMIN", email: "x@y.com", isActive: false }) as Record<string, unknown>;
    expect(parsed.role).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.isActive).toBeUndefined();
  });
});

describe("products", () => {
  const p = { name: "Tee", sku: "TEE-1", description: "A very nice tee.", price: "20", stock: "5" };
  it("accepts a valid product", () => expect(productSchema.safeParse(p).success).toBe(true));
  it("rejects a sale price not below price", () => expect(productSchema.safeParse({ ...p, salePrice: "25" }).success).toBe(false));
  it("rejects negative stock and zero price", () => {
    expect(productSchema.safeParse({ ...p, stock: "-1" }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, price: "0" }).success).toBe(false);
  });
});

describe("coupons", () => {
  it("caps percentage at 100 and uppercases the code", () => {
    expect(couponSchema.safeParse({ code: "bad", type: "PERCENTAGE", value: 150 }).success).toBe(false);
    expect(couponSchema.parse({ code: "spring10", type: "PERCENTAGE", value: 10 }).code).toBe("SPRING10");
  });
});

describe("checkout", () => {
  const addr = { fullName: "Ada L", phone: "12345678", line1: "1 Main St", city: "Paris", postalCode: "75001", country: "France" };
  it("requires an idempotency key and valid enums", () => {
    const ok = { email: "a@b.com", shippingAddress: addr, shippingMethod: "standard", paymentMethod: "COD", idempotencyKey: "x".repeat(20) };
    expect(checkoutSchema.safeParse(ok).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...ok, idempotencyKey: "short" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, paymentMethod: "BITCOIN" }).success).toBe(false);
  });
  it("ignores client-supplied prices", () => {
    const parsed = checkoutSchema.parse({ email: "a@b.com", shippingAddress: addr, shippingMethod: "standard", paymentMethod: "COD", idempotencyKey: "x".repeat(20), totalCents: 1, subtotalCents: 1 }) as Record<string, unknown>;
    expect(parsed.totalCents).toBeUndefined();
    expect(parsed.subtotalCents).toBeUndefined();
  });
  it("validates addresses", () => expect(addressSchema.safeParse({ ...addr, line1: "" }).success).toBe(false));
});
