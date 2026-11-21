import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";

type Ctx = { params: { id: string } };

export const PATCH = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const { isActive } = z.object({ isActive: z.boolean() }).parse(await req.json());
  const coupon = await db.coupon.update({ where: { id: params.id }, data: { isActive } });
  await logAdminActivity({ actorId: admin.id, action: isActive ? "coupon.enable" : "coupon.disable", entity: "Coupon", entityId: params.id });
  return NextResponse.json({ coupon });
});

export const DELETE = api(async (_r: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  await db.coupon.delete({ where: { id: params.id } });
  await logAdminActivity({ actorId: admin.id, action: "coupon.delete", entity: "Coupon", entityId: params.id });
  return NextResponse.json({ ok: true });
});
