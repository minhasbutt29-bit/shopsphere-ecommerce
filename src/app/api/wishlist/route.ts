import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";

const body = z.object({ productId: z.string().min(1) });

export const GET = api(async () => {
  const user = await requireUserApi();
  const wl = await db.wishlist.findUnique({ where: { userId: user.id }, include: { items: true } });
  return NextResponse.json({ productIds: wl?.items.map((i) => i.productId) ?? [] });
});

/** Toggles a product in the caller's wishlist. */
export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  const { productId } = body.parse(await req.json());
  const product = await db.product.findFirst({ where: { id: productId, isPublished: true }, select: { id: true } });
  if (!product) throw new HttpError(404, "Product not found");
  const wl = await db.wishlist.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  const existing = await db.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } });
  if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
  else await db.wishlistItem.create({ data: { wishlistId: wl.id, productId } });
  return NextResponse.json({ wishlisted: !existing });
});
