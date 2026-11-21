import Link from "next/link";
import { Star } from "lucide-react";
import { Badge, ProductImage } from "@/components/ui/misc";
import { discountPercent, effectivePrice, formatMoney } from "@/lib/money";
import type { ProductCardData } from "@/services/products";
import { WishlistButton } from "./wishlist-button";
import { CompareButton } from "./compare-button";

export function ProductCard({ product, wished = false }: { product: ProductCardData; wished?: boolean }) {
  const off = discountPercent(product);
  const out = product.stock < 1;
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-secondary">
          <div className="h-full w-full transition-transform duration-500 group-hover:scale-105"><ProductImage src={product.images[0]?.url} alt={product.name} /></div>
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {off > 0 && <Badge tone="danger">-{off}%</Badge>}
            {out && <Badge>Sold out</Badge>}
            {!out && product.stock <= 5 && <Badge tone="warning">Only {product.stock} left</Badge>}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {product.brand && <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.brand}</p>}
          <h3 className="font-sans text-sm font-medium">{product.name}</h3>
          <p className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{formatMoney(effectivePrice(product))}</span>
            {off > 0 && <span className="text-muted-foreground line-through">{formatMoney(product.priceCents)}</span>}
          </p>
          {product.ratingCount > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-current" aria-hidden />{product.ratingAvg.toFixed(1)} ({product.ratingCount})</p>
          )}
        </div>
      </Link>
      <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <WishlistButton productId={product.id} initial={wished} />
        <CompareButton productId={product.id} />
      </div>
    </article>
  );
}

export function ProductGrid({ products, wishedIds = [] }: { products: ProductCardData[]; wishedIds?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => <ProductCard key={p.id} product={p} wished={wishedIds.includes(p.id)} />)}
    </div>
  );
}
