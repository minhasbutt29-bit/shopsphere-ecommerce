import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";

// A customer only ever sees their own orders: userId comes from the session, never from the request.
export const GET = api(async () => {
  const user = await requireUserApi();
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true, payment: true } });
  return NextResponse.json({ orders });
});
