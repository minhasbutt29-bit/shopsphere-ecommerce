import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { parseCsv, slugify } from "@/lib/utils";
import { productSchema } from "@/validation/schemas";
import { toCents } from "@/lib/money";

/** CSV columns: name,sku,description,brand,price,salePrice,stock,category,isPublished */
export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file provided");
  if (file.size > 2 * 1024 * 1024) throw new HttpError(413, "CSV must be 2MB or smaller");
  const [header, ...rows] = parseCsv(await file.text());
  if (!header) throw new HttpError(400, "Empty file");
  if (rows.length > 1000) throw new HttpError(400, "Maximum 1000 rows per import");
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  for (const col of ["name", "sku", "description", "price", "stock"]) if (!(col in idx)) throw new HttpError(400, `Missing column: ${col}`);

  const categories = new Map((await db.category.findMany()).map((c) => [c.name.toLowerCase(), c.id]));
  let created = 0, updated = 0;
  const errors: { row: number; error: string }[] = [];

  for (const [n, r] of rows.entries()) {
    const get = (k: string) => (k in idx ? (r[idx[k]] ?? "").trim() : "");
    const parsed = productSchema.safeParse({
      name: get("name"), sku: get("sku"), description: get("description"), brand: get("brand"), price: get("price"),
      salePrice: get("salePrice"), stock: get("stock"), isPublished: get("isPublished") === "true", isFeatured: false,
    });
    if (!parsed.success) { errors.push({ row: n + 2, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); continue; }
    const d = parsed.data;
    const categoryId = categories.get(get("category").toLowerCase()) ?? null;
    try {
      const existing = await db.product.findUnique({ where: { sku: d.sku } });
      if (existing) {
        await db.product.update({ where: { id: existing.id }, data: { name: d.name, description: d.description, brand: d.brand || null, priceCents: toCents(d.price), salePriceCents: d.salePrice ? toCents(d.salePrice) : null, categoryId, isPublished: d.isPublished } });
        updated++;
      } else {
        await db.$transaction(async (tx) => {
          const base = slugify(d.name);
          const clash = await tx.product.count({ where: { slug: { startsWith: base } } });
          const p = await tx.product.create({ data: { name: d.name, slug: clash ? `${base}-${clash + 1}` : base, sku: d.sku, description: d.description, brand: d.brand || null, priceCents: toCents(d.price), salePriceCents: d.salePrice ? toCents(d.salePrice) : null, stock: d.stock, categoryId, isPublished: d.isPublished } });
          if (d.stock > 0) await tx.inventoryMovement.create({ data: { productId: p.id, type: "INITIAL", change: d.stock, stockAfter: d.stock, actorId: admin.id, note: "CSV import" } });
        });
        created++;
      }
    } catch (e) {
      errors.push({ row: n + 2, error: e instanceof Error ? "Database error" : "Unknown error" });
    }
  }
  await logAdminActivity({ actorId: admin.id, action: "product.import", entity: "Product", meta: { created, updated, failed: errors.length } });
  return NextResponse.json({ created, updated, errors });
});
