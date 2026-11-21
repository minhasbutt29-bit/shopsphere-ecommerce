/**
 * Database-backed tests for checkout, stock, coupons, cancellation and refund consistency.
 * They run against a REAL, DISPOSABLE PostgreSQL database and are skipped unless TEST_DATABASE_URL is set:
 *
 *   TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/shopsphere_test" npm test
 *
 * Apply migrations to that database first:  DATABASE_URL=$TEST_DATABASE_URL DIRECT_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 * WARNING: these tests delete data. Never point TEST_DATABASE_URL at a database you care about.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
vi.mock("@/lib/email", () => ({ emails: new Proxy({}, { get: () => async () => undefined }), sendEmail: async () => undefined }));

describe.skipIf(!url)("checkout (database)", () => {
  let db: typeof import("@/lib/db").db;
  let createOrderFromCart: typeof import("@/services/checkout").createOrderFromCart;
  let cancelOrder: typeof import("@/services/orders").cancelOrder;
  const tag = `t${Date.now()}`;
  const addr = { fullName: "Test", phone: "123456", line1: "1 Test St", city: "Testville", postalCode: "12345", country: "US", isDefault: false };
  const input = (key: string, extra: Record<string, unknown> = {}) => ({ email: "t@example.com", shippingAddress: addr, billingSameAsShipping: true, shippingMethod: "standard" as const, paymentMethod: "COD" as const, idempotencyKey: key.padEnd(20, "0"), ...extra });

  beforeAll(async () => {
    process.env.DATABASE_URL = url; process.env.DIRECT_URL = url;
    ({ db } = await import("@/lib/db"));
    ({ createOrderFromCart } = await import("@/services/checkout"));
    ({ cancelOrder } = await import("@/services/orders"));
  });

  async function setup(stock: number, users = 1) {
    const product = await db.product.create({ data: { name: `P-${tag}-${Math.random()}`, slug: `p-${tag}-${Math.random()}`, sku: `SKU-${tag}-${Math.random()}`, description: "desc desc desc", priceCents: 5000, stock, isPublished: true } });
    const made = [];
    for (let i = 0; i < users; i++) {
      const user = await db.user.create({ data: { email: `${tag}-${Math.random()}@example.com`, name: "T" } });
      const cart = await db.cart.create({ data: { userId: user.id } });
      await db.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } });
      made.push(user);
    }
    return { product, users: made };
  }

  afterAll(async () => {
    if (!url) return;
    await db.order.deleteMany({ where: { email: "t@example.com" } });
    await db.product.deleteMany({ where: { sku: { startsWith: `SKU-${tag}` } } });
    await db.user.deleteMany({ where: { email: { startsWith: tag } } });
    await db.coupon.deleteMany({ where: { code: { startsWith: "T" + tag.slice(-6).toUpperCase() } } });
    await db.$disconnect();
  });

  it("never oversells: two concurrent buyers, one unit", async () => {
    const { product, users } = await setup(1, 2);
    const results = await Promise.allSettled(users.map((u, i) => createOrderFromCart(u.id, input(`race${i}${tag}`))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(0);
    expect(await db.inventoryMovement.count({ where: { productId: product.id, type: "PURCHASE" } })).toBe(1);
  });

  it("is idempotent: the same key twice creates exactly one order", async () => {
    const { product, users } = await setup(5);
    const key = `idem${tag}`;
    const [a, b] = await Promise.all([createOrderFromCart(users[0].id, input(key)), createOrderFromCart(users[0].id, input(key)).catch(() => null)]);
    expect(await db.order.count({ where: { idempotencyKey: key.padEnd(20, "0") } })).toBe(1);
    expect(a.number).toBeTruthy();
    if (b) expect(b.id).toBe(a.id);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(4);
  });

  it("prices from the database and snapshots items", async () => {
    const { users } = await setup(3);
    const order = await createOrderFromCart(users[0].id, input(`price${tag}`));
    expect(order.subtotalCents).toBe(5000);
    expect(order.status).toBe("CONFIRMED"); // COD is confirmed immediately
  });

  it("redeems coupons atomically and honours usage limits", async () => {
    const code = ("T" + tag.slice(-6)).toUpperCase() + "A";
    await db.coupon.create({ data: { code, type: "FIXED", value: 1000, usageLimit: 1, perUserLimit: 1 } });
    const { users } = await setup(5, 2);
    const results = await Promise.allSettled(users.map((u, i) => createOrderFromCart(u.id, input(`cpn${i}${tag}`, { couponCode: code }))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { code } })).usedCount).toBe(1);
  });

  it("cancelling restores stock and releases the coupon; double-cancel is rejected", async () => {
    const code = ("T" + tag.slice(-6)).toUpperCase() + "B";
    await db.coupon.create({ data: { code, type: "PERCENTAGE", value: 10 } });
    const { product, users } = await setup(3);
    const order = await createOrderFromCart(users[0].id, input(`cancel${tag}`, { couponCode: code }));
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(2);
    await cancelOrder(order.id);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(3);
    expect((await db.coupon.findUniqueOrThrow({ where: { code } })).usedCount).toBe(0);
    await expect(cancelOrder(order.id)).rejects.toMatchObject({ status: 409 });
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(3);
  });
});
