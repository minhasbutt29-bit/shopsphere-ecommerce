import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { recalcRating } from "@/services/products";

type Ctx = { params: { id: string } };

export const PATCH = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const { status } = z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING"]) }).parse(await req.json());
  const review = await db.review.findUnique({ where: { id: params.id } });
  if (!review) throw new HttpError(404, "Review not found");
  await db.review.update({ where: { id: params.id }, data: { status } });
  await recalcRating(review.productId);
  await logAdminActivity({ actorId: admin.id, action: `review.${status.toLowerCase()}`, entity: "Review", entityId: params.id });
  return NextResponse.json({ ok: true });
});

export const DELETE = api(async (_r: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const review = await db.review.findUnique({ where: { id: params.id } });
  if (!review) throw new HttpError(404, "Review not found");
  await db.review.delete({ where: { id: params.id } });
  await recalcRating(review.productId);
  await logAdminActivity({ actorId: admin.id, action: "review.delete", entity: "Review", entityId: params.id });
  return NextResponse.json({ ok: true });
});
