import { NextResponse } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";

const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export const GET = api(async (req: Request) => {
  await requireAdminApi();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  const where: Prisma.OrderWhereInput = {
    ...(status && STATUSES.includes(status) ? { status: status as OrderStatus } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { payment: true, items: { select: { id: true } } } });
  return NextResponse.json({ orders });
});
