import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { Card, StatusBadge } from "@/components/ui/misc";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function Overview() {
  const user = await requireUser();
  const [orders, count, wish, addr] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.order.count({ where: { userId: user.id } }),
    db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
    db.address.count({ where: { userId: user.id } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Hello, {user.name?.split(" ")[0] ?? "there"}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Orders", count, "/account/orders"], ["Wishlist", wish, "/account/wishlist"], ["Addresses", addr, "/account/addresses"]].map(([l, n, h]) => (
          <Link key={l as string} href={h as string}><Card className="p-5 transition hover:bg-muted"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-1 font-display text-3xl">{n}</p></Card></Link>
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-xl">Recent orders</h2>
        {orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet. <Link href="/shop" className="underline">Start shopping</Link></p> : (
          <ul className="divide-y rounded-lg border">
            {orders.map((o) => (
              <li key={o.id}><Link href={`/account/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50">
                <span><span className="font-medium">{o.number}</span><span className="ml-3 text-sm text-muted-foreground">{o.createdAt.toLocaleDateString("en-US")}</span></span>
                <span className="flex items-center gap-4"><StatusBadge status={o.status} /><span className="text-sm">{formatMoney(o.totalCents, o.currency)}</span></span>
              </Link></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
