"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { formatMoney, effectivePrice } from "@/lib/money";
import { ProductImage } from "@/components/ui/misc";

type Suggestion = { id: string; name: string; slug: string; priceCents: number; salePriceCents: number | null; images: { url: string }[] };

export function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Suggestion[]>([]);

  React.useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setResults((await res.json()).results);
      } catch { /* aborted */ }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  return (
    <>
      <button type="button" aria-label="Search" onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"><Search className="h-5 w-5" /></button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Search products" className="fixed inset-0 z-50 bg-background/95 backdrop-blur" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <div className="container max-w-2xl pt-24">
            <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) { setOpen(false); router.push(`/shop?q=${encodeURIComponent(q.trim())}`); } }} className="flex items-center gap-3 border-b pb-3">
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="flex-1 bg-transparent text-xl outline-none" />
              <button type="button" aria-label="Close search" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </form>
            <ul className="mt-4 divide-y">
              {results.map((r) => (
                <li key={r.id}>
                  <Link href={`/product/${r.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-4 py-3 hover:bg-muted/50">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md"><ProductImage src={r.images[0]?.url} alt={r.name} className="text-lg" /></div>
                    <span className="flex-1 text-sm font-medium">{r.name}</span>
                    <span className="text-sm text-muted-foreground">{formatMoney(effectivePrice(r))}</span>
                  </Link>
                </li>
              ))}
              {q.trim().length >= 2 && results.length === 0 && <li className="py-6 text-sm text-muted-foreground">No suggestions. Press Enter to search all products.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
