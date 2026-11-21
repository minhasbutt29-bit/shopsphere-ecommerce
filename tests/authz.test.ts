import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUser = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: (...a: unknown[]) => findUser(...a) } } }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

import { assertOwner, canAccessAdmin, requireAdmin, requireAdminApi, requireUserApi } from "@/lib/authz";
import { HttpError } from "@/lib/http";

const session = (id: string, role: string) => authMock.mockResolvedValue({ user: { id, role } });
const dbUser = (role: "ADMIN" | "CUSTOMER", isActive = true) => findUser.mockResolvedValue({ id: "u1", email: "u@x.com", name: "U", role, isActive });

beforeEach(() => { authMock.mockReset(); findUser.mockReset(); });

describe("API guards", () => {
  it("anonymous → 401", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdminApi()).rejects.toMatchObject({ status: 401 });
    await expect(requireUserApi()).rejects.toMatchObject({ status: 401 });
  });
  it("customer → 403 on admin APIs", async () => {
    session("u1", "CUSTOMER"); dbUser("CUSTOMER");
    await expect(requireAdminApi()).rejects.toMatchObject({ status: 403 });
  });
  it("a forged ADMIN role in the token is ignored: the database decides", async () => {
    session("u1", "ADMIN"); dbUser("CUSTOMER");
    await expect(requireAdminApi()).rejects.toMatchObject({ status: 403 });
  });
  it("admin passes", async () => {
    session("u1", "ADMIN"); dbUser("ADMIN");
    await expect(requireAdminApi()).resolves.toMatchObject({ role: "ADMIN" });
  });
  it("deactivated admin or customer loses access immediately", async () => {
    session("u1", "ADMIN"); dbUser("ADMIN", false);
    await expect(requireAdminApi()).rejects.toMatchObject({ status: 401 });
    await expect(requireUserApi()).rejects.toMatchObject({ status: 401 });
  });
});

describe("page guards", () => {
  it("anonymous is redirected to login", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
  });
  it("customer gets a 404 (admin area is not revealed)", async () => {
    session("u1", "CUSTOMER"); dbUser("CUSTOMER");
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });
});

describe("helpers", () => {
  it("canAccessAdmin", () => {
    expect(canAccessAdmin({ role: "ADMIN" })).toBe(true);
    expect(canAccessAdmin({ role: "ADMIN", isActive: false })).toBe(false);
    expect(canAccessAdmin({ role: "CUSTOMER" })).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
  });
  it("assertOwner hides other people's resources behind a 404", () => {
    expect(() => assertOwner("u2", { id: "u1" })).toThrow(HttpError);
    try { assertOwner("u2", { id: "u1" }); } catch (e) { expect((e as HttpError).status).toBe(404); }
    expect(() => assertOwner("u1", { id: "u1" })).not.toThrow();
  });
});
