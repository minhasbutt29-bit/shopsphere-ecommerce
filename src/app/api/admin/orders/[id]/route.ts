import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { orderStatusSchema } from "@/validation/schemas";
import { updateOrderStatus } from "@/services/orders";

type Ctx = { params: { id: string } };

export const GET = api(async (_r: Request, { params }: Ctx) => {
  await requireAdminApi();
  const order = await db.order.findUnique({ where: { id: params.id }, include: { items: true, payment: true, user: { select: { id: true, name: true, email: true } } } });
  if (!order) throw new HttpError(404, "Order not found");
  return NextResponse.json({ order });
});

export const PATCH = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const input = orderStatusSchema.parse(await req.json());
  const order = await updateOrderStatus(params.id, input, admin.id);
  return NextResponse.json({ order });
});
