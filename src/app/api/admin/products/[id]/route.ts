import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { productSchema } from "@/validation/schemas";
import { toCents } from "@/lib/money";
import { deleteImage } from "@/lib/cloudinary";

type Ctx = { params: { id: string } };

export const GET = api(async (_r: Request, { params }: Ctx) => {
  await requireAdminApi();
  const product = await db.product.findUnique({ where: { id: params.id }, include: { images: { orderBy: { position: "asc" } }, variants: true } });
  if (!product) throw new HttpError(404, "Product not found");
  return NextResponse.json({ product });
});

/** Stock is intentionally NOT editable here; use /api/admin/inventory so every change is logged. */
export const PUT = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const d = productSchema.parse(await req.json());
  try {
    const product = await db.product.update({
      where: { id: params.id },
      data: {
        name: d.name, sku: d.sku, description: d.description, brand: d.brand || null,
        priceCents: toCents(d.price), salePriceCents: d.salePrice ? toCents(d.salePrice) : null,
        lowStockAt: d.lowStockAt, categoryId: d.categoryId || null, isPublished: d.isPublished, isFeatured: d.isFeatured,
      },
    });
    await logAdminActivity({ actorId: admin.id, action: "product.update", entity: "Product", entityId: product.id, ip: clientIp(req) });
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") throw new HttpError(409, "SKU already exists");
      if (e.code === "P2025") throw new HttpError(404, "Product not found");
    }
    throw e;
  }
});

/** Quick toggles for publish / featured from the product list. */
export const PATCH = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const d = z.object({ isPublished: z.boolean().optional(), isFeatured: z.boolean().optional() }).parse(await req.json());
  const res = await db.product.updateMany({ where: { id: params.id }, data: d });
  if (res.count !== 1) throw new HttpError(404, "Product not found");
  await logAdminActivity({ actorId: admin.id, action: "product.toggle", entity: "Product", entityId: params.id, meta: d, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});

export const DELETE = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const product = await db.product.findUnique({ where: { id: params.id }, include: { images: true } });
  if (!product) throw new HttpError(404, "Product not found");
  await db.product.delete({ where: { id: params.id } }); // order items keep their snapshot (productId → SetNull)
  await Promise.all(product.images.map((i) => (i.publicId ? deleteImage(i.publicId) : null)));
  await logAdminActivity({ actorId: admin.id, action: "product.delete", entity: "Product", entityId: params.id, meta: { sku: product.sku }, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
