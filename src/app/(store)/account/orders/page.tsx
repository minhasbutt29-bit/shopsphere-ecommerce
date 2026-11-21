import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: { select: { id: true } } } });
  return (
    <div>
      <h1 className="text-3xl">My orders</h1>
      <div className="mt-6">
        {orders.length === 0 ? <EmptyState title="No orders yet" action={<Button asChild><Link href="/shop">Start shopping</Link></Button>} /> : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left"><tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Items</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th><th className="p-3" /></tr></thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-3 font-medium">{o.number}</td><td className="p-3">{o.createdAt.toLocaleDateString("en-US")}</td><td className="p-3">{o.items.length}</td>
                    <td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3 text-right">{formatMoney(o.totalCents, o.currency)}</td>
                    <td className="p-3 text-right"><Link className="underline" href={`/account/orders/${o.id}`}>Details & tracking</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
