"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";
import type { CartLine } from "@/services/cart";

export function CartView({ lines, subtotalCents, flatShippingCents, freeOverCents }: { lines: CartLine[]; subtotalCents: number; flatShippingCents: number; freeOverCents: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [discount, setDiscount] = React.useState<{ code: string; cents: number } | null>(null);

  async function setQty(itemId: string, quantity: number) {
    setBusy(itemId);
    await attempt(() => apiFetch("/api/cart", { method: "PATCH", json: { itemId, quantity } }));
    router.refresh();
    setBusy(null);
  }

  async function applyCoupon() {
    const r = await attempt(() => apiFetch<{ code: string; discountCents: number }>("/api/coupons/validate", { method: "POST", json: { code } }), "Coupon applied");
    if (r) setDiscount({ code: r.code, cents: r.discountCents });
  }

  const after = Math.max(0, subtotalCents - (discount?.cents ?? 0));
  const shipping = after >= freeOverCents && freeOverCents > 0 ? 0 : flatShippingCents;
  const hasUnavailable = lines.some((l) => l.unavailable);

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y border-y">
        {lines.map((l) => (
          <li key={l.id} className="flex gap-4 py-6">
            <Link href={`/product/${l.slug}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-md bg-secondary"><ProductImage src={l.image} alt={l.name} /></Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/product/${l.slug}`} className="font-medium hover:underline">{l.name}</Link>
                  {l.variantLabel && <p className="text-sm text-muted-foreground">{l.variantLabel}</p>}
                  {l.unavailable && <p className="mt-1 text-sm text-destructive">No longer available. Remove it to continue.</p>}
                </div>
                <p className="font-medium">{formatMoney(l.lineCents)}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <div className="flex items-center rounded-md border" role="group" aria-label={`Quantity for ${l.name}`}>
                  <button type="button" aria-label="Decrease" disabled={busy === l.id} className="h-9 w-9 hover:bg-muted" onClick={() => setQty(l.id, l.quantity - 1)}><Minus className="mx-auto h-4 w-4" /></button>
                  <span className="w-9 text-center text-sm">{l.quantity}</span>
                  <button type="button" aria-label="Increase" disabled={busy === l.id || l.quantity >= l.available} className="h-9 w-9 hover:bg-muted" onClick={() => setQty(l.id, l.quantity + 1)}><Plus className="mx-auto h-4 w-4" /></button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setQty(l.id, 0)} aria-label={`Remove ${l.name}`}><Trash2 className="h-4 w-4" /> Remove</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit space-y-5 rounded-lg border p-6" aria-label="Order summary">
        <h2 className="text-xl">Summary</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) void applyCoupon(); }} className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" aria-label="Discount code" />
          <Button type="submit" variant="outline">Apply</Button>
        </form>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(subtotalCents)}</dd></div>
          {discount && <div className="flex justify-between text-emerald-600"><dt>Discount ({discount.code})</dt><dd>-{formatMoney(discount.cents)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping (standard)</dt><dd>{shipping === 0 ? "Free" : formatMoney(shipping)}</dd></div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Estimated total</dt><dd>{formatMoney(after + shipping)}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Taxes and final shipping are confirmed at checkout.</p>
        <Button asChild size="lg" className="w-full" disabled={hasUnavailable}>
          <Link href={discount ? `/checkout?coupon=${encodeURIComponent(discount.code)}` : "/checkout"} aria-disabled={hasUnavailable}>Checkout</Link>
        </Button>
      </aside>
    </div>
  );
}
