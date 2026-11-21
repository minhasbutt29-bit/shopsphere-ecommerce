import Link from "next/link";
import { AlertTriangle, DollarSign, Package, ShoppingCart, Users, Clock, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/authz";
import { dashboardStats, revenueSeries, statusBreakdown } from "@/services/analytics";
import { formatMoney } from "@/lib/money";
import { Card, StatusBadge } from "@/components/ui/misc";
import { RevenueChart } from "@/components/admin/revenue-chart";

export const metadata = { title: "Dashboard" };

export default async function AdminHome() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [s, series, breakdown] = await Promise.all([dashboardStats(), revenueSeries("day", since), statusBreakdown()]);

  const tiles = [
    { label: "Total revenue", value: formatMoney(s.revenueCents), icon: DollarSign },
    { label: "Total orders", value: s.totalOrders, icon: ShoppingCart },
    { label: "Customers", value: s.customers, icon: Users },
    { label: "Products", value: s.products, icon: Package },
    { label: "Pending orders", value: s.pending, icon: Clock },
    { label: "Delivered orders", value: s.completed, icon: CheckCircle2 },
    { label: "Low-stock products", value: s.lowStock.length, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">{label}<Icon className="h-4 w-4" aria-hidden /></div><p className="mt-2 font-display text-3xl">{value}</p></Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-4 text-lg">Revenue, last 30 days</h2>
          {series.length ? <RevenueChart data={series} /> : <p className="py-16 text-center text-sm text-muted-foreground">No revenue in this period yet.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-lg">Orders by status</h2>
          <ul className="space-y-2 text-sm">{breakdown.map((b) => <li key={b.status} className="flex items-center justify-between"><StatusBadge status={b.status} /><span>{b.count}</span></li>)}</ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-5"><h2 className="text-lg">Recent orders</h2><Link className="text-sm underline" href="/admin/orders">View all</Link></div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <tbody className="divide-y border-t">
              {s.recentOrders.map((o) => (
                <tr key={o.id}><td className="p-3 pl-5"><Link className="font-medium hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link></td><td className="p-3">{o.user?.name ?? o.email}</td><td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3 pr-5 text-right">{formatMoney(o.totalCents, o.currency)}</td></tr>
              ))}
            </tbody></table></div>
        </Card>
        <div className="space-y-6">
          <Card className="p-5"><h2 className="mb-3 text-lg">Best sellers</h2><ol className="space-y-2 text-sm">{s.top.map((p, i) => <li key={p.id} className="flex justify-between gap-2"><span>{i + 1}. {p.name}</span><span className="text-muted-foreground">{p.soldCount} sold</span></li>)}</ol></Card>
          <Card className="p-5"><h2 className="mb-3 text-lg">Low stock</h2>
            {s.lowStock.length === 0 ? <p className="text-sm text-muted-foreground">All products are well stocked.</p> : <ul className="space-y-2 text-sm">{s.lowStock.slice(0, 6).map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{p.name}</span><span className="font-medium text-destructive">{p.stock} left</span></li>)}</ul>}
            <Link href="/admin/inventory" className="mt-3 inline-block text-sm underline">Manage inventory</Link></Card>
        </div>
      </div>
    </div>
  );
}
