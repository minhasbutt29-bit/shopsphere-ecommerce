/** All money is stored as integer cents. */
export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function toCents(value: number | string): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

export function effectivePrice(p: { priceCents: number; salePriceCents?: number | null }): number {
  return p.salePriceCents != null && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents;
}

export function discountPercent(p: { priceCents: number; salePriceCents?: number | null }): number {
  if (p.salePriceCents == null || p.salePriceCents >= p.priceCents) return 0;
  return Math.round(((p.priceCents - p.salePriceCents) / p.priceCents) * 100);
}
