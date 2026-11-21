import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";
import { cancelOwnOrder } from "@/services/orders";

export const GET = api(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserApi();
  const order = await db.order.findFirst({ where: { id: params.id, userId: user.id }, include: { items: true, payment: true } });
  if (!order) throw new HttpError(404, "Order not found"); // 404 (not 403) so other customers' order ids are not confirmable
  return NextResponse.json({ order });
});

export const DELETE = api(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserApi();
  await cancelOwnOrder(user.id, params.id);
  return NextResponse.json({ ok: true });
});
