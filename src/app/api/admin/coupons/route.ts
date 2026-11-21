import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { couponSchema } from "@/validation/schemas";
import { toCents } from "@/lib/money";

export const GET = api(async () => {
  await requireAdminApi();
  return NextResponse.json({ coupons: await db.coupon.findMany({ orderBy: { createdAt: "desc" } }) });
});

export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const d = couponSchema.parse(await req.json());
  try {
    const coupon = await db.coupon.create({
      data: {
        code: d.code, type: d.type, value: d.type === "FIXED" ? toCents(d.value) : Math.round(d.value),
        minSubtotalCents: toCents(d.minSubtotal), usageLimit: d.usageLimit ?? null, perUserLimit: d.perUserLimit ?? null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null, isActive: d.isActive,
      },
    });
    await logAdminActivity({ actorId: admin.id, action: "coupon.create", entity: "Coupon", entityId: coupon.id });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "Coupon code already exists");
    throw e;
  }
});
