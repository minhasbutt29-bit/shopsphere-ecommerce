import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUser = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: new Proxy({}, { get: (_t, k) => (k === "user" ? { findUnique: (...a: unknown[]) => findUser(...a) } : new Proxy({}, { get: () => () => { throw new Error("DB touched before authorization"); } })) }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const ROOT = path.resolve(__dirname, "../src/app/api/admin");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? routeFiles(p) : f === "route.ts" ? [p] : [];
  });
}

const files = routeFiles(ROOT);
const asUser = (role: "CUSTOMER" | "ADMIN") => {
  authMock.mockResolvedValue({ user: { id: "u1", role } });
  findUser.mockResolvedValue({ id: "u1", email: "u@x.com", name: "U", role, isActive: true });
};

beforeEach(() => { authMock.mockReset(); findUser.mockReset(); });

describe("every /api/admin/* handler is protected", () => {
  it("discovers the admin route files", () => expect(files.length).toBeGreaterThan(15));

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    it(`${rel}: anonymous → 401, customer → 403 for every HTTP method`, async () => {
      const mod = (await import(file)) as Record<string, (req: Request, ctx: { params: Record<string, string> }) => Promise<Response>>;
      const exported = METHODS.filter((m) => typeof mod[m] === "function");
      expect(exported.length).toBeGreaterThan(0);
      for (const method of exported) {
        const req = () => new Request("http://localhost/api/admin/x", { method, ...(method === "GET" ? {} : { body: "{}", headers: { "content-type": "application/json" } }) });
        authMock.mockResolvedValue(null);
        expect((await mod[method](req(), { params: { id: "x" } })).status, `${method} anonymous`).toBe(401);
        asUser("CUSTOMER");
        expect((await mod[method](req(), { params: { id: "x" } })).status, `${method} customer`).toBe(403);
      }
    });
  }
});
