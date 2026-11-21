import { redirect, notFound } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { HttpError } from "./http";

export type AuthUser = { id: string; email: string; name: string | null; role: "CUSTOMER" | "ADMIN" };

/**
 * Resolves the current user from the DB (never trusting the JWT's role claim alone).
 * Deactivated users and demoted admins lose access immediately.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** For pages / server components. Redirects anonymous users to login. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For admin pages / server actions. Non-admins get a 404 so the area's existence is not revealed. */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** For route handlers: throws HttpError 401/403 which `api()` converts to JSON. */
export async function requireUserApi(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

export async function requireAdminApi(): Promise<AuthUser> {
  const user = await requireUserApi();
  if (user.role !== "ADMIN") throw new HttpError(403, "Forbidden");
  return user;
}

/** Pure helper used by tests: the single source of truth for role checks. */
export function canAccessAdmin(user: { role: string; isActive?: boolean } | null | undefined): boolean {
  return !!user && user.isActive !== false && user.role === "ADMIN";
}

/** Ownership check for customer-owned records; admins may read but ownership is explicit. */
export function assertOwner(ownerId: string | null | undefined, user: { id: string }) {
  if (!ownerId || ownerId !== user.id) throw new HttpError(404, "Resource not found");
}
