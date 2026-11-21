import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";

export const GET = api(async (req: Request) => {
  await requireAdminApi();
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    // Explicit allow-list: passwordHash, tokens and lockout fields are never selected.
    select: { id: true, name: true, email: true, phone: true, isActive: true, emailVerified: true, createdAt: true, _count: { select: { orders: true } } },
  });
  return NextResponse.json({ customers });
});
