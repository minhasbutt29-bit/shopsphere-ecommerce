import Link from "next/link";
import type { Metadata } from "next";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { listBrands, listCategories, listProducts } from "@/services/products";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "Shop", description: "Browse the full ShopSphere collection." };

const schema = z.object({
  q: z.string().max(100).optional(), category: z.string().max(100).optional(), brand: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional().catch(undefined), maxPrice: z.coerce.number().min(0).optional().catch(undefined),
  rating: z.coerce.number().min(1).max(5).optional().catch(undefined),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export default async function ShopPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const f = schema.parse(searchParams);
  const user = await getCurrentUser();
  const [{ items, total, page, pages }, categories, brands, wl] = await Promise.all([
    listProducts(f), listCategories(), listBrands(),
    user ? db.wishlistItem.findMany({ where: { wishlist: { userId: user.id } }, select: { productId: true } }) : Promise.resolve([]),
  ]);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][]);
    sp.set("page", String(p));
    return `/shop?${sp.toString()}`;
  };

  return (
    <div className="container py-10">
      <h1 className="text-4xl">{f.q ? `Results for “${f.q}”` : "Shop"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} {total === 1 ? "product" : "products"}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <form method="get" className="space-y-5 lg:sticky lg:top-28 lg:self-start" aria-label="Filters">
          <Input name="q" defaultValue={f.q} placeholder="Search" aria-label="Search" />
          <Select name="category" defaultValue={f.category ?? ""} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </Select>
          <Select name="brand" defaultValue={f.brand ?? ""} aria-label="Brand">
            <option value="">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input name="minPrice" type="number" min={0} defaultValue={f.minPrice} placeholder="Min $" aria-label="Minimum price" />
            <Input name="maxPrice" type="number" min={0} defaultValue={f.maxPrice} placeholder="Max $" aria-label="Maximum price" />
          </div>
          <Select name="rating" defaultValue={f.rating ?? ""} aria-label="Minimum rating">
            <option value="">Any rating</option>
            {[4, 3, 2].map((r) => <option key={r} value={r}>{r}★ & up</option>)}
          </Select>
          <Select name="sort" defaultValue={f.sort ?? "newest"} aria-label="Sort by">
            <option value="newest">Newest</option>
            <option value="popular">Most popular</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Apply</Button>
            <Button asChild variant="outline"><Link href="/shop">Reset</Link></Button>
          </div>
        </form>

        <div>
          {items.length === 0 ? (
            <EmptyState title="No products found" description="Try adjusting your filters or search term." action={<Button asChild><Link href="/shop">Clear filters</Link></Button>} />
          ) : (
            <ProductGrid products={items} wishedIds={wl.map((w) => w.productId)} />
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
              {page > 1 && <Button asChild variant="outline" size="sm"><Link href={pageHref(page - 1)}>Previous</Link></Button>}
              <span className="px-3 text-sm text-muted-foreground">Page {page} of {pages}</span>
              {page < pages && <Button asChild variant="outline" size="sm"><Link href={pageHref(page + 1)}>Next</Link></Button>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
