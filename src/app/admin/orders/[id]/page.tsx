import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { Card, StatusBadge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { OrderStatusForm } from "@/components/admin/order-status-form";

export const metadata = { title: "Order" };
type Addr = { fullName: string; phone?: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string };

export default async function AdminOrder({ params }: { params: { id: string } }) {
  await requireAdmin();
  const o = await db.order.findUnique({ where: { id: params.id }, include: { items: true, payment: true, user: { select: { id: true, name: true } } } });
  if (!o) notFound();
  const a = o.shippingAddress as unknown as Addr;
  const m = (c: number) => formatMoney(c, o.currency);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">{o.number}</h1><p className="text-sm text-muted-foreground">{o.createdAt.toLocaleString("en-US")} · {o.email}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={o.status} /><Button asChild variant="outline" size="sm"><a href={`/api/orders/${o.id}/invoice`} target="_blank" rel="noopener">Invoice</a></Button></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">Item</th><th className="p-3 text-right">Unit</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Total</th></tr></thead>
            <tbody className="divide-y">{o.items.map((i) => <tr key={i.id}><td className="p-3">{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""}<br /><span className="text-xs text-muted-foreground">{i.sku}</span></td><td className="p-3 text-right">{m(i.unitCents)}</td><td className="p-3 text-right">{i.quantity}</td><td className="p-3 text-right">{m(i.totalCents)}</td></tr>)}</tbody></table>
          <dl className="space-y-1 border-t p-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between"><dt>Discount {o.couponCode}</dt><dd>-{m(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping ({o.shippingMethod})</dt><dd>{m(o.shippingCents)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{m(o.taxCents)}</dd></div>
            <div className="flex justify-between pt-1 font-semibold"><dt>Total</dt><dd>{m(o.totalCents)}</dd></div>
          </dl>
        </Card>
        <div className="space-y-6">
          <Card className="p-5 text-sm"><h2 className="mb-2 text-lg">Ship to</h2><p>{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode}<br />{a.country}{a.phone ? <><br />{a.phone}</> : null}</p>
            {o.user && <p className="mt-3"><Link className="underline" href={`/admin/customers/${o.user.id}`}>View customer</Link></p>}
            {o.notes && <p className="mt-3 text-muted-foreground">Note: {o.notes}</p>}</Card>
          <Card className="p-5 text-sm"><h2 className="mb-2 text-lg">Payment</h2><p>{o.payment?.method === "COD" ? "Cash on delivery" : "Card (Stripe)"} · <StatusBadge status={o.payment?.status ?? "PENDING"} /></p>{o.payment?.failureReason && <p className="mt-1 text-destructive">{o.payment.failureReason}</p>}</Card>
          <Card className="p-5"><h2 className="mb-3 text-lg">Update status</h2><OrderStatusForm orderId={o.id} status={o.status} paid={o.payment?.status === "PAID"} trackingNumber={o.trackingNumber ?? ""} carrier={o.carrier ?? ""} /></Card>
        </div>
      </div>
    </div>
  );
}
