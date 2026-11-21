import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/misc";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order confirmed", robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: { order?: string } }) {
  const user = await requireUser();
  const order = searchParams.order
    ? await db.order.findFirst({ where: { number: searchParams.order, userId: user.id }, include: { payment: true } }) // ownership enforced
    : null;
  return (
    <div className="container max-w-xl py-24 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
      <h1 className="mt-6 text-4xl">Thank you!</h1>
      {order ? (
        <>
          <p className="mt-3 text-muted-foreground">Order <strong>{order.number}</strong> · {formatMoney(order.totalCents, order.currency)}</p>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm">Order <StatusBadge status={order.status} /> Payment <StatusBadge status={order.payment?.status ?? "PENDING"} /></p>
          {order.payment?.method === "STRIPE" && order.payment.status === "PENDING" && <p className="mt-4 text-sm text-muted-foreground">We're confirming your payment. This page updates once Stripe notifies us. Refresh in a few seconds.</p>}
        </>
      ) : <p className="mt-3 text-muted-foreground">We couldn't find that order in your account.</p>}
      <div className="mt-10 flex justify-center gap-3">
        <Button asChild><Link href="/account/orders">View my orders</Link></Button>
        <Button asChild variant="outline"><Link href="/shop">Continue shopping</Link></Button>
      </div>
    </div>
  );
}
