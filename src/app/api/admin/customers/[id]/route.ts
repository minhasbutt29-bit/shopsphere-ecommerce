import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";

type Ctx = { params: { id: string } };

export const GET = api(async (_r: Request, { params }: Ctx) => {
  await requireAdminApi();
  const customer = await db.user.findFirst({
    where: { id: params.id, role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, number: true, status: true, totalCents: true, createdAt: true } } },
  });
  if (!customer) throw new HttpError(404, "Customer not found");
  return NextResponse.json({ customer });
});

export const PATCH = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const { isActive } = z.object({ isActive: z.boolean() }).parse(await req.json());
  if (params.id === admin.id) throw new HttpError(400, "You cannot deactivate your own account");
  const res = await db.user.updateMany({ where: { id: params.id, role: "CUSTOMER" }, data: { isActive } });
  if (res.count !== 1) throw new HttpError(404, "Customer not found");
  if (!isActive) await db.session.deleteMany({ where: { userId: params.id } });
  await logAdminActivity({ actorId: admin.id, action: isActive ? "customer.activate" : "customer.deactivate", entity: "User", entityId: params.id });
  return NextResponse.json({ ok: true });
});
