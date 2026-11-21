import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/lib/http";
import { listProducts } from "@/services/products";

const q = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const GET = api(async (req: Request) => {
  const params = q.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await listProducts(params));
});
