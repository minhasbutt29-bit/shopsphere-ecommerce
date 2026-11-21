"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

type P = { id: string; name: string; sku: string; stock: number; variants: { id: string; sku: string; size: string | null; color: string | null; stock: number }[] };

export function StockAdjustForm({ products }: { products: P[] }) {
  const router = useRouter();
  const [productId, setProductId] = React.useState(products[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const product = products.find((p) => p.id === productId);
  if (!products.length) return <p className="text-sm text-muted-foreground">Create a product first.</p>;
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget; const fd = new FormData(form);
      setBusy(true);
      const ok = await attempt(() => apiFetch("/api/admin/inventory", { method: "POST", json: { productId, variantId: fd.get("variantId") || null, change: fd.get("change"), note: fd.get("note") || undefined } }), "Stock updated");
      setBusy(false);
      if (ok) { form.reset(); router.refresh(); }
    }}>
      <Field label="Product"><Select value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}</Select></Field>
      {product && product.variants.length > 0 && <Field label="Variant"><Select name="variantId" required>{product.variants.map((v) => <option key={v.id} value={v.id}>{[v.size, v.color].filter(Boolean).join(" / ") || v.sku} ({v.stock})</option>)}</Select></Field>}
      <Field label="Change (+ add, − remove)" hint="e.g. 25 to restock, -3 to write off damaged items."><Input name="change" type="number" step={1} required /></Field>
      <Field label="Note"><Input name="note" maxLength={200} /></Field>
      <Button type="submit" loading={busy} className="w-full">Apply</Button>
    </form>
  );
}
