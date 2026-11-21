import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PAGE_SIZE = 12;

export type ShopFilters = {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "popular";
  page?: number;
};

const cardSelect = {
  id: true, name: true, slug: true, priceCents: true, salePriceCents: true, stock: true, ratingAvg: true, ratingCount: true, brand: true, isFeatured: true, createdAt: true,
  images: { orderBy: { position: "asc" as const }, take: 2, select: { url: true, alt: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export async function listProducts(f: ShopFilters) {
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.ProductWhereInput = {
    isPublished: true,
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { brand: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {}),
    ...(f.category ? { category: { slug: f.category } } : {}),
    ...(f.brand ? { brand: f.brand } : {}),
    ...(f.rating ? { ratingAvg: { gte: f.rating } } : {}),
    ...(f.minPrice != null || f.maxPrice != null ? { priceCents: { ...(f.minPrice != null ? { gte: Math.round(f.minPrice * 100) } : {}), ...(f.maxPrice != null ? { lte: Math.round(f.maxPrice * 100) } : {}) } } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    f.sort === "price-asc" ? { priceCents: "asc" } : f.sort === "price-desc" ? { priceCents: "desc" } : f.sort === "popular" ? { soldCount: "desc" } : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: cardSelect }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const featuredProducts = (take = 8) => db.product.findMany({ where: { isPublished: true, isFeatured: true }, orderBy: { createdAt: "desc" }, take, select: cardSelect });
export const newArrivals = (take = 8) => db.product.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, take, select: cardSelect });
export const bestSellers = (take = 8) => db.product.findMany({ where: { isPublished: true }, orderBy: { soldCount: "desc" }, take, select: cardSelect });
export const onSale = (take = 4) => db.product.findMany({ where: { isPublished: true, salePriceCents: { not: null } }, orderBy: { createdAt: "desc" }, take, select: cardSelect });

export async function relatedProducts(productId: string, categoryId: string | null, take = 4) {
  return db.product.findMany({
    where: { isPublished: true, id: { not: productId }, ...(categoryId ? { categoryId } : {}) },
    orderBy: { soldCount: "desc" },
    take,
    select: cardSelect,
  });
}

export async function productsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { id: { in: ids }, isPublished: true }, select: cardSelect });
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
}

export async function searchSuggestions(q: string) {
  if (q.trim().length < 2) return [];
  return db.product.findMany({
    where: { isPublished: true, name: { contains: q.trim(), mode: "insensitive" } },
    take: 6,
    select: { id: true, name: true, slug: true, priceCents: true, salePriceCents: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, isPublished: true },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { id: "asc" } },
      category: true,
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });
}

export async function recalcRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await db.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
}

export const listCategories = () => db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: { where: { isPublished: true } } } } } });
export const listBrands = async () => (await db.product.findMany({ where: { isPublished: true, brand: { not: null } }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } })).map((b) => b.brand as string);
