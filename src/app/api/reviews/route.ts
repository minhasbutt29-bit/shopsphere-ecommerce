import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";
import { reviewSchema } from "@/validation/schemas";

/** One review per customer per product; only verified purchasers; goes to moderation queue. */
export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  const data = reviewSchema.parse(await req.json());
  const purchased = await db.orderItem.findFirst({
    where: { productId: data.productId, order: { userId: user.id, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
    select: { id: true },
  });
  if (!purchased) throw new HttpError(403, "Only customers who purchased this product can review it");
  const existing = await db.review.findUnique({ where: { productId_userId: { productId: data.productId, userId: user.id } } });
  if (existing) throw new HttpError(409, "You have already reviewed this product");
  const review = await db.review.create({ data: { ...data, userId: user.id, status: "PENDING" } });
  return NextResponse.json({ id: review.id, status: review.status }, { status: 201 });
});
