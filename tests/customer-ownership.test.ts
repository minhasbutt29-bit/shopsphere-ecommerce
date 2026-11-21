import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const orderFindFirst = vi.fn();
const orderFindMany = vi.fn();
const addressDeleteMany = vi.fn();
const cartItemFindFirst = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ ok: true, remaining: 1, retryAfterSec: 0 }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: async () => ({ id: "me", email: "me@x.com", name: "Me", role: "CUSTOMER", isActive: true }) },
    order: { findFirst: (...a: unknown[]) => orderFindFirst(...a), findMany: (...a: unknown[]) => orderFindMany(...a) },
    address: { deleteMany: (...a: unknown[]) => addressDeleteMany(...a), count: async () => 0 },
    cartItem: { findFirst: (...a: unknown[]) => cartItemFindFirst(...a) },
  },
}));

import { GET as getOrder, DELETE as cancelOrderRoute } from "@/app/api/orders/[id]/route";
import { DELETE as deleteAddress } from "@/app/api/account/addresses/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { PATCH as patchCart } from "@/app/api/cart/route";

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ user: { id: "me", role: "CUSTOMER" } });
  orderFindFirst.mockReset(); orderFindMany.mockReset().mockResolvedValue([]); addressDeleteMany.mockReset(); cartItemFindFirst.mockReset();
});

describe("customer data ownership", () => {
  it("order lookups are always scoped to the session user, never a client-supplied id", async () => {
    orderFindFirst.mockResolvedValue(null);
    const res = await getOrder(new Request("http://x"), { params: { id: "someone-elses-order" } });
    expect(res.status).toBe(404);
    expect(orderFindFirst.mock.calls[0][0].where).toMatchObject({ id: "someone-elses-order", userId: "me" });
  });

  it("cancelling another customer's order is a 404, not a state change", async () => {
    orderFindFirst.mockResolvedValue(null);
    const res = await cancelOrderRoute(new Request("http://x", { method: "DELETE" }), { params: { id: "other" } });
    expect(res.status).toBe(404);
    expect(orderFindFirst.mock.calls[0][0].where.userId).toBe("me");
  });

  it("address deletion puts userId in the WHERE clause", async () => {
    addressDeleteMany.mockResolvedValue({ count: 0 });
    const res = await deleteAddress(new Request("http://x", { method: "DELETE", body: JSON.stringify({ id: "addr-of-other-user" }), headers: { "content-type": "application/json" } }));
    expect(res.status).toBe(404);
    expect(addressDeleteMany.mock.calls[0][0].where).toEqual({ id: "addr-of-other-user", userId: "me" });
  });

  it("cart items are matched through the caller's own cart", async () => {
    cartItemFindFirst.mockResolvedValue(null);
    const res = await patchCart(new Request("http://x", { method: "PATCH", body: JSON.stringify({ itemId: "foreign-item", quantity: 2 }), headers: { "content-type": "application/json" } }));
    expect(res.status).toBe(404);
    expect(cartItemFindFirst.mock.calls[0][0].where).toMatchObject({ id: "foreign-item", cart: { userId: "me" } });
  });

  it("order listing is scoped to the session user", async () => {
    const res = await listOrders();
    expect(res.status).toBe(200);
    expect(orderFindMany.mock.calls[0][0].where).toEqual({ userId: "me" });
  });

  it("unauthenticated requests get 401 on customer endpoints", async () => {
    authMock.mockResolvedValue(null);
    expect((await getOrder(new Request("http://x"), { params: { id: "1" } })).status).toBe(401);
    expect((await listOrders()).status).toBe(401);
  });
});
