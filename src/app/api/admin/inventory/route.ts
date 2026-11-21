import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { stockAdjustSchema } from "@/validation/schemas";
import { adjustStock, lowStockProducts } from "@/services/inventory";

export const GET = api(async () => {
  await requireAdminApi();
  const [movements, low] = await Promise.all([
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { name: true, sku: true } } } }),
    lowStockProducts(),
  ]);
  return NextResponse.json({ movements, lowStock: low });
});

export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const d = stockAdjustSchema.parse(await req.json());
  const exists = await db.product.findUnique({ where: { id: d.productId }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Product not found");
  const stock = await adjustStock({ productId: d.productId, variantId: d.variantId, change: d.change, note: d.note, actorId: admin.id });
  await logAdminActivity({ actorId: admin.id, action: "inventory.adjust", entity: "Product", entityId: d.productId, meta: { change: d.change, note: d.note ?? null } });
  return NextResponse.json({ stock });
});
