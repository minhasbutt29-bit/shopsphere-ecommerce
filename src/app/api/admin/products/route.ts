import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { productSchema } from "@/validation/schemas";
import { toCents } from "@/lib/money";
import { slugify } from "@/lib/utils";

export const GET = api(async (req: Request) => {
  await requireAdminApi();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const products = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { category: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ products });
});

export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const d = productSchema.parse(await req.json());
  try {
    const product = await db.$transaction(async (tx) => {
      const base = slugify(d.name);
      const clash = await tx.product.count({ where: { slug: { startsWith: base } } });
      const p = await tx.product.create({
        data: {
          name: d.name, slug: clash ? `${base}-${clash + 1}` : base, sku: d.sku, description: d.description,
          brand: d.brand || null, priceCents: toCents(d.price), salePriceCents: d.salePrice ? toCents(d.salePrice) : null,
          stock: d.stock, lowStockAt: d.lowStockAt, categoryId: d.categoryId || null, isPublished: d.isPublished, isFeatured: d.isFeatured,
        },
      });
      if (d.stock > 0) await tx.inventoryMovement.create({ data: { productId: p.id, type: "INITIAL", change: d.stock, stockAfter: d.stock, actorId: admin.id, note: "Initial stock" } });
      return p;
    });
    await logAdminActivity({ actorId: admin.id, action: "product.create", entity: "Product", entityId: product.id, ip: clientIp(req) });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "SKU already exists");
    throw e;
  }
});
