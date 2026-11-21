import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { productsByIds } from "@/services/products";

/** Public, published-only lookup used by "recently viewed" and "compare". */
export const GET = api(async (req: Request) => {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9]{10,40}$/i.test(s)).slice(0, 4);
  const rows = await productsByIds(ids);
  return NextResponse.json({
    items: rows.map((p) => ({ id: p.id, name: p.name, slug: p.slug, priceCents: p.priceCents, salePriceCents: p.salePriceCents, image: p.images[0]?.url ?? null, brand: p.brand, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, stock: p.stock, category: p.category?.name ?? null })),
  });
});
