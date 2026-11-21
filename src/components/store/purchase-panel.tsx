"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = { id: string; size: string | null; color: string | null; stock: number; priceCents: number | null };

export function PurchasePanel({ productId, stock, variants, signedIn, basePriceCents }: { productId: string; stock: number; variants: Variant[]; signedIn: boolean; basePriceCents: number }) {
  const router = useRouter();
  const [variantId, setVariantId] = React.useState<string | null>(variants.find((v) => v.stock > 0)?.id ?? null);
  const [qty, setQty] = React.useState(1);
  const [busy, setBusy] = React.useState<"add" | "buy" | null>(null);

  const variant = variants.find((v) => v.id === variantId);
  const available = variants.length ? variant?.stock ?? 0 : stock;
  const price = variant?.priceCents ?? basePriceCents;
  const label = (v: Variant) => [v.size, v.color].filter(Boolean).join(" / ") || "Default";

  React.useEffect(() => setQty((q) => Math.max(1, Math.min(q, available || 1))), [available]);

  async function add(buyNow: boolean) {
    if (!signedIn) return router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    setBusy(buyNow ? "buy" : "add");
    try {
      await apiFetch("/api/cart", { method: "POST", json: { productId, variantId, quantity: qty } });
      if (buyNow) return router.push("/checkout");
      toast.success("Added to cart", { action: { label: "View cart", onClick: () => router.push("/cart") } });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.push("/login");
      else toast.error(e instanceof Error ? e.message : "Could not add to cart");
    } finally { setBusy(null); }
  }

  return (
    <div className="mt-8 space-y-6">
      {variants.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Options</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" disabled={v.stock < 1} aria-pressed={v.id === variantId} onClick={() => setVariantId(v.id)}
                className={cn("rounded-md border px-4 py-2 text-sm transition", v.id === variantId ? "border-foreground bg-foreground text-background" : "hover:border-foreground", v.stock < 1 && "cursor-not-allowed line-through opacity-40")}>
                {label(v)}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className={cn("text-sm", available < 1 ? "text-destructive" : available <= 5 ? "text-amber-600" : "text-emerald-600")} aria-live="polite">
        {available < 1 ? "Out of stock" : available <= 5 ? `Only ${available} left` : "In stock"}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" className="h-10 w-10 hover:bg-muted" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="mx-auto h-4 w-4" /></button>
          <span className="w-10 text-center text-sm" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase quantity" className="h-10 w-10 hover:bg-muted" onClick={() => setQty((q) => Math.min(available, q + 1))} disabled={qty >= available}><Plus className="mx-auto h-4 w-4" /></button>
        </div>
        <span className="text-sm text-muted-foreground">Total {formatMoney(price * qty)}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="flex-1" disabled={available < 1} loading={busy === "add"} onClick={() => add(false)}>Add to cart</Button>
        <Button size="lg" variant="outline" className="flex-1" disabled={available < 1} loading={busy === "buy"} onClick={() => add(true)}>Buy now</Button>
      </div>
    </div>
  );
}
