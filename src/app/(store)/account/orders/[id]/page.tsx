import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { customerCanCancel } from "@/services/pricing";
import { StatusBadge, ProductImage } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CancelOrderButton } from "@/components/account/cancel-order-button";

export const metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

const STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
type Addr = { fullName: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string };

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  // Ownership enforced in the query: someone else's order id resolves to 404.
  const order = await db.order.findFirst({ where: { id: params.id, userId: user.id }, include: { items: true, payment: true } });
  if (!order) notFound();
  const idx = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const a = order.shippingAddress as unknown as Addr;
  const terminal = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">{order.number}</h1><p className="text-sm text-muted-foreground">Placed {order.createdAt.toLocaleString("en-US")}</p></div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm"><a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noopener">Download invoice</a></Button>
          {customerCanCancel(order.status) && order.payment?.status !== "PAID" && <CancelOrderButton orderId={order.id} />}
        </div>
      </div>

      <section aria-label="Order tracking" className="rounded-lg border p-6">
        <h2 className="mb-5 text-lg">Tracking</h2>
        {terminal ? <p className="flex items-center gap-2 text-sm">This order is <StatusBadge status={order.status} /></p> : (
          <ol className="grid grid-cols-5 gap-2 text-center text-xs">
            {STEPS.map((s, i) => (
              <li key={s} className="space-y-2">
                <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${i <= idx ? "border-foreground bg-foreground text-background" : "text-muted-foreground"}`}>{i <= idx ? <Check className="h-4 w-4" aria-hidden /> : i + 1}</span>
                <span className={i <= idx ? "font-medium" : "text-muted-foreground"}>{s.charAt(0) + s.slice(1).toLowerCase()}</span>
              </li>
            ))}
          </ol>
        )}
        {order.trackingNumber && <p className="mt-5 text-sm">Carrier: <strong>{order.carrier ?? "–"}</strong> · Tracking number: <strong>{order.trackingNumber}</strong></p>}
      </section>

      <section className="rounded-lg border">
        <ul className="divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 p-4">
              <div className="h-16 w-14 shrink-0 overflow-hidden rounded bg-secondary"><ProductImage src={i.image} alt={i.name} className="text-lg" /></div>
              <div className="flex-1 text-sm"><p className="font-medium">{i.name}</p>{i.variantLabel && <p className="text-muted-foreground">{i.variantLabel}</p>}<p className="text-muted-foreground">Qty {i.quantity} × {formatMoney(i.unitCents, order.currency)}</p></div>
              <p className="text-sm font-medium">{formatMoney(i.totalCents, order.currency)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-5 text-sm"><h2 className="mb-2 text-lg">Shipping to</h2><p>{a.fullName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode}<br />{a.country}</p></div>
        <dl className="space-y-2 rounded-lg border p-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalCents, order.currency)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Discount {order.couponCode}</dt><dd>-{formatMoney(order.discountCents, order.currency)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{formatMoney(order.shippingCents, order.currency)}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.taxCents, order.currency)}</dd></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalCents, order.currency)}</dd></div>
          <div className="flex justify-between pt-2"><dt>Payment</dt><dd>{order.payment?.method === "COD" ? "Cash on delivery" : "Card"} · <StatusBadge status={order.payment?.status ?? "PENDING"} /></dd></div>
        </dl>
      </div>
      <Link href="/account/orders" className="text-sm underline">← All orders</Link>
    </div>
  );
}
