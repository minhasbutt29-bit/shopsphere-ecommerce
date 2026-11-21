"use client";
import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ProductImage } from "@/components/ui/misc";
import { formatMoney, effectivePrice } from "@/lib/money";
import { readCompare, writeCompare } from "./compare-button";

type Item = { id: string; name: string; slug: string; priceCents: number; salePriceCents: number | null; image: string | null; brand: string | null; ratingAvg: number; ratingCount: number; stock: number; category: string | null };

export function CompareView() {
  const [items, setItems] = React.useState<Item[] | null>(null);
  React.useEffect(() => {
    const ids = readCompare();
    if (!ids.length) { setItems([]); return; }
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`).then((r) => r.json()).then((d) => setItems(d.items)).catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="mt-8 text-sm text-muted-foreground">Loading…</p>;
  if (!items.length) return <div className="mt-8"><EmptyState title="Nothing to compare yet" description="Use the compare icon on any product card to add up to 4 products." action={<Button asChild><Link href="/shop">Browse products</Link></Button>} /></div>;

  const remove = (id: string) => { writeCompare(readCompare().filter((i) => i !== id)); setItems(items.filter((i) => i.id !== id)); };
  const rows: [string, (p: Item) => React.ReactNode][] = [
    ["Price", (p) => formatMoney(effectivePrice(p))], ["Brand", (p) => p.brand ?? "–"], ["Category", (p) => p.category ?? "–"],
    ["Rating", (p) => (p.ratingCount ? `${p.ratingAvg.toFixed(1)} / 5 (${p.ratingCount})` : "No reviews")],
    ["Availability", (p) => (p.stock > 0 ? "In stock" : "Sold out")],
  ];
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr><th className="w-32" />
            {items.map((p) => (
              <th key={p.id} className="p-3 text-left align-top font-normal">
                <div className="relative"><button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)} className="absolute right-1 top-1 z-10 rounded-full bg-background p-1 shadow"><X className="h-4 w-4" /></button>
                  <Link href={`/product/${p.slug}`}><div className="aspect-square overflow-hidden rounded-lg bg-secondary"><ProductImage src={p.image} alt={p.name} /></div><p className="mt-2 font-medium">{p.name}</p></Link></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(([label, f]) => <tr key={label} className="border-t"><th scope="row" className="p-3 text-left font-medium">{label}</th>{items.map((p) => <td key={p.id} className="p-3">{f(p)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
