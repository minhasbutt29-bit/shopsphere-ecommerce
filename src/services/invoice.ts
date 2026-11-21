import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "./settings";

type Addr = { fullName: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string; phone?: string };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const addr = (a: Addr) => [a.fullName, a.line1, a.line2, `${a.city}${a.state ? ", " + a.state : ""} ${a.postalCode}`, a.country].filter(Boolean).map(esc).join("<br>");

/** Returns a print-ready HTML invoice (use browser "Save as PDF"). Callers must authorise access first. */
export async function renderInvoiceHtml(orderId: string): Promise<string | null> {
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } }),
    getSettings(),
  ]);
  if (!order) return null;
  const m = (c: number) => formatMoney(c, order.currency);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(order.number)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#111;max-width:800px;margin:40px auto;padding:0 24px}h1{letter-spacing:.1em;text-transform:uppercase;font-size:22px}
table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px 8px;border-bottom:1px solid #e5e5e5;text-align:left;font-size:14px}th:last-child,td:last-child,th:nth-child(3),td:nth-child(3),th:nth-child(2),td:nth-child(2){text-align:right}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;font-size:14px}.tot td{border:0}.muted{color:#666}@media print{button{display:none}}</style></head><body>
<button onclick="window.print()" style="float:right;padding:8px 16px">Print / Save PDF</button>
<h1>${esc(settings.storeName)}</h1><p class="muted">${esc(settings.contactEmail)}${settings.address ? "<br>" + esc(settings.address) : ""}</p>
<h2>Invoice ${esc(order.number)}</h2><p class="muted">Date: ${order.createdAt.toISOString().slice(0, 10)} · Status: ${esc(order.status)} · Payment: ${esc(order.payment?.method)} (${esc(order.payment?.status)})</p>
<div class="grid"><div><strong>Ship to</strong><br>${addr(order.shippingAddress as Addr)}</div><div><strong>Bill to</strong><br>${addr(order.billingAddress as Addr)}</div></div>
<table><thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Total</th></tr></thead><tbody>
${order.items.map((i) => `<tr><td>${esc(i.name)}${i.variantLabel ? ` <span class="muted">(${esc(i.variantLabel)})</span>` : ""}<br><span class="muted">${esc(i.sku)}</span></td><td>${m(i.unitCents)}</td><td>${i.quantity}</td><td>${m(i.totalCents)}</td></tr>`).join("")}
</tbody></table>
<table class="tot"><tr><td></td><td>Subtotal</td><td>${m(order.subtotalCents)}</td></tr>
${order.discountCents ? `<tr><td></td><td>Discount ${esc(order.couponCode)}</td><td>-${m(order.discountCents)}</td></tr>` : ""}
<tr><td></td><td>Shipping</td><td>${m(order.shippingCents)}</td></tr><tr><td></td><td>Tax</td><td>${m(order.taxCents)}</td></tr>
<tr><td></td><td><strong>Total</strong></td><td><strong>${m(order.totalCents)}</strong></td></tr></table></body></html>`;
}
