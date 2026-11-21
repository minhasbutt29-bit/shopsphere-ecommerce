import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { variantSchema } from "@/validation/schemas";
import { toCents } from "@/lib/money";

type Ctx = { params: { id: string } };

export const POST = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const d = variantSchema.parse(await req.json());
  const product = await db.product.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!product) throw new HttpError(404, "Product not found");
  try {
    const variant = await db.$transaction(async (tx) => {
      const v = await tx.productVariant.create({ data: { productId: product.id, sku: d.sku, size: d.size || null, color: d.color || null, priceCents: d.price ? toCents(d.price) : null, stock: d.stock } });
      if (d.stock > 0) {
        // Keep the product-level stock equal to the sum of its variants.
        const p = await tx.product.update({ where: { id: product.id }, data: { stock: { increment: d.stock } } });
        await tx.inventoryMovement.create({ data: { productId: product.id, variantId: v.id, type: "INITIAL", change: d.stock, stockAfter: p.stock, actorId: admin.id, note: "Variant created" } });
      }
      return v;
    });
    return NextResponse.json({ variant }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "Variant SKU already exists");
    throw e;
  }
});

export const DELETE = api(async (req: Request, { params }: Ctx) => {
  await requireAdminApi();
  const { variantId } = z.object({ variantId: z.string().min(1) }).parse(await req.json());
  await db.$transaction(async (tx) => {
    const v = await tx.productVariant.findFirst({ where: { id: variantId, productId: params.id } });
    if (!v) throw new HttpError(404, "Variant not found");
    await tx.productVariant.delete({ where: { id: v.id } });
    await tx.product.update({ where: { id: params.id }, data: { stock: { decrement: Math.min(v.stock, (await tx.product.findUniqueOrThrow({ where: { id: params.id } })).stock) } } });
  });
  return NextResponse.json({ ok: true });
});
