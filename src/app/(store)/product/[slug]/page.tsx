import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { getProductBySlug, relatedProducts } from "@/services/products";
import { discountPercent, effectivePrice, formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/misc";
import { ProductGrid } from "@/components/store/product-card";
import { Gallery } from "@/components/store/gallery";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { WishlistButton } from "@/components/store/wishlist-button";
import { RecentlyViewed } from "@/components/store/recently-viewed";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug(params.slug);
  if (!p) return { title: "Product not found" };
  const desc = p.description.slice(0, 160);
  return { title: p.name, description: desc, openGraph: { title: p.name, description: desc, type: "website", images: p.images[0] ? [p.images[0].url] : [] } };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const user = await getCurrentUser();
  const [related, wished, canReview] = await Promise.all([
    relatedProducts(product.id, product.categoryId),
    user ? db.wishlistItem.findFirst({ where: { productId: product.id, wishlist: { userId: user.id } } }) : null,
    user
      ? db.orderItem.findFirst({ where: { productId: product.id, order: { userId: user.id, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } } })
      : null,
  ]);
  const off = discountPercent(product);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: product.name, sku: product.sku, description: product.description,
    image: product.images.map((i) => i.url), brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: { "@type": "Offer", priceCurrency: "USD", price: (effectivePrice(product) / 100).toFixed(2), availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div className="container py-10">
      {/* JSON-LD is built from our own DB values and serialised by JSON.stringify; "<" is escaped to prevent script breakout. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        {product.category && <> / <Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link></>}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={product.images.map((i) => ({ url: i.url, alt: i.alt ?? product.name }))} name={product.name} />
        <div>
          {product.brand && <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.brand}</p>}
          <div className="mt-1 flex items-start justify-between gap-4">
            <h1 className="text-4xl">{product.name}</h1>
            <WishlistButton productId={product.id} initial={!!wished} className="border" />
          </div>
          {product.ratingCount > 0 && <p className="mt-2 flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-current" aria-hidden />{product.ratingAvg.toFixed(1)} <span className="text-muted-foreground">({product.ratingCount} reviews)</span></p>}
          <p className="mt-4 flex items-center gap-3 text-2xl">
            <span className="font-semibold">{formatMoney(effectivePrice(product))}</span>
            {off > 0 && <><span className="text-base text-muted-foreground line-through">{formatMoney(product.priceCents)}</span><Badge tone="danger">Save {off}%</Badge></>}
          </p>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>
          <PurchasePanel
            productId={product.id}
            stock={product.stock}
            basePriceCents={effectivePrice(product)}
            variants={product.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock, priceCents: v.priceCents }))}
            signedIn={!!user}
          />
          <p className="mt-6 text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>

      <section className="mt-20" aria-labelledby="reviews">
        <h2 id="reviews" className="text-2xl">Customer reviews</h2>
        {product.reviews.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p> : (
          <ul className="mt-6 divide-y">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-5">
                <p className="flex items-center gap-1 text-sm" aria-label={`${r.rating} out of 5 stars`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-muted-foreground/40"}`} aria-hidden />)}</p>
                {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{r.user.name ?? "Customer"} · {r.createdAt.toLocaleDateString("en-US")}</p>
              </li>
            ))}
          </ul>
        )}
        {canReview && <p className="mt-6 text-sm">Purchased this? <Link className="underline" href="/account/reviews">Write a review</Link></p>}
      </section>

      {related.length > 0 && <section className="mt-20"><h2 className="mb-8 text-2xl">You may also like</h2><ProductGrid products={related} /></section>}
      <RecentlyViewed currentId={product.id} />
    </div>
  );
}
