"use client";
import * as React from "react";
import Link from "next/link";
import { formatMoney, effectivePrice } from "@/lib/money";
import { ProductImage } from "@/components/ui/misc";

type Item = { id: string; name: string; slug: string; priceCents: number; salePriceCents: number | null; image: string | null };
const KEY = "shopsphere:recent";

/** Per-browser convenience list (not account data). The current product is recorded via the API-less product lookup below. */
export function RecentlyViewed({ currentId }: { currentId: string }) {
  const [items, setItems] = React.useState<Item[]>([]);
  React.useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { /* ignore */ }
    const next = [currentId, ...ids.filter((i) => i !== currentId)].slice(0, 9);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    const others = next.filter((i) => i !== currentId).slice(0, 4);
    if (!others.length) return;
    fetch(`/api/products/by-ids?ids=${others.join(",")}`).then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setItems(d.items)).catch(() => undefined);
  }, [currentId]);

  if (!items.length) return null;
  return (
    <section className="mt-20" aria-labelledby="recent">
      <h2 id="recent" className="mb-8 text-2xl">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group">
            <div className="aspect-square overflow-hidden rounded-lg bg-secondary"><ProductImage src={p.image} alt={p.name} /></div>
            <p className="mt-2 text-sm font-medium">{p.name}</p>
            <p className="text-sm text-muted-foreground">{formatMoney(effectivePrice(p))}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
