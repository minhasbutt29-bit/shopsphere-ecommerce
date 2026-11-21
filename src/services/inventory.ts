import type { MovementType } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { emails } from "@/lib/email";
import { getSettings } from "./settings";

type StockChange = {
  productId: string;
  variantId?: string | null;
  change: number; // signed
  type: MovementType;
  orderId?: string;
  note?: string;
  actorId?: string;
};

/**
 * Atomically changes stock and records a movement. Decrements use a conditional UPDATE
 * (`stock >= amount`) so two concurrent checkouts can never oversell.
 * Must be called inside a transaction.
 */
export async function applyStockChange(tx: Tx, c: StockChange): Promise<number> {
  const amount = Math.abs(c.change);
  if (c.change === 0) throw new HttpError(400, "Stock change cannot be zero");

  if (c.variantId) {
    const res = await tx.productVariant.updateMany({
      where: { id: c.variantId, productId: c.productId, ...(c.change < 0 ? { stock: { gte: amount } } : {}) },
      data: { stock: c.change < 0 ? { decrement: amount } : { increment: amount } },
    });
    if (res.count !== 1) throw new HttpError(409, "Insufficient stock for the selected variant");
  }

  const res = await tx.product.updateMany({
    where: { id: c.productId, ...(c.change < 0 ? { stock: { gte: amount } } : {}) },
    data: { stock: c.change < 0 ? { decrement: amount } : { increment: amount } },
  });
  if (res.count !== 1) throw new HttpError(409, "Insufficient stock");

  const after = await tx.product.findUniqueOrThrow({ where: { id: c.productId }, select: { stock: true } });
  await tx.inventoryMovement.create({
    data: {
      productId: c.productId,
      variantId: c.variantId ?? null,
      orderId: c.orderId,
      type: c.type,
      change: c.change,
      stockAfter: after.stock,
      note: c.note,
      actorId: c.actorId,
    },
  });
  return after.stock;
}

export async function adjustStock(input: Omit<StockChange, "type">) {
  const stock = await db.$transaction((tx) => applyStockChange(tx, { ...input, type: input.change > 0 ? "RESTOCK" : "ADJUSTMENT" }));
  await notifyLowStock([input.productId]);
  return stock;
}

export async function lowStockProducts() {
  // Prisma cannot compare two columns in `where`; filter in SQL-free fashion with a bounded fetch.
  const candidates = await db.product.findMany({ where: { stock: { lte: 50 } }, select: { id: true, name: true, sku: true, stock: true, lowStockAt: true }, orderBy: { stock: "asc" }, take: 500 });
  return candidates.filter((p) => p.stock <= p.lowStockAt);
}

export async function notifyLowStock(productIds: string[]) {
  try {
    const settings = await getSettings();
    if (!settings.lowStockEmail) return;
    const items = (await db.product.findMany({ where: { id: { in: productIds } }, select: { name: true, sku: true, stock: true, lowStockAt: true } })).filter((p) => p.stock <= p.lowStockAt);
    if (items.length) await emails.lowStock(settings.lowStockEmail, items);
  } catch (e) {
    console.error("[inventory] low-stock notification failed", e);
  }
}
