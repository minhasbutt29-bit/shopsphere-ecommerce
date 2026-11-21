import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/authz";
import { customerGrowth, revenueSeries } from "@/services/analytics";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Reports" };

const exports = [["orders", "Orders"], ["revenue-daily", "Daily revenue"], ["revenue-monthly", "Monthly revenue"], ["revenue-yearly", "Annual revenue"], ["top-products", "Top products"], ["customer-growth", "Customer growth"], ["inventory", "Inventory"]];

export default async function AdminReports() {
  await requireAdmin();
  const now = Date.now();
  const [daily, monthly, yearly, growth, top] = await Promise.all([
    revenueSeries("day", new Date(now - 30 * 86_400_000)),
    revenueSeries("month", new Date(now - 365 * 86_400_000)),
    revenueSeries("year", new Date("2000-01-01")),
    customerGrowth(new Date(now - 365 * 86_400_000)),
    db.product.findMany({ orderBy: { soldCount: "desc" }, take: 10, select: { id: true, name: true, soldCount: true, priceCents: true } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Reports & analytics</h1>
      <Card className="p-5"><h2 className="mb-3 text-lg">Export CSV</h2><div className="flex flex-wrap gap-2">{exports.map(([t, l]) => <Button key={t} asChild variant="outline" size="sm"><a href={`/api/admin/reports/export?type=${t}`}><Download className="h-4 w-4" /> {l}</a></Button>)}</div></Card>
      <Card className="p-5"><h2 className="mb-4 text-lg">Daily revenue (30 days)</h2>{daily.length ? <RevenueChart data={daily} /> : <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>}</Card>
      <Card className="p-5"><h2 className="mb-4 text-lg">Monthly revenue (12 months)</h2>{monthly.length ? <RevenueChart data={monthly} /> : <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>}</Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5"><h2 className="mb-3 text-lg">Annual revenue</h2><ul className="space-y-1 text-sm">{yearly.map((y) => <li key={y.date} className="flex justify-between"><span>{y.date.slice(0, 4)}</span><span>${y.revenue.toFixed(2)} · {y.orders} orders</span></li>)}{yearly.length === 0 && <li className="text-muted-foreground">No data yet.</li>}</ul></Card>
        <Card className="p-5"><h2 className="mb-3 text-lg">Customer growth</h2><ul className="space-y-1 text-sm">{growth.map((g) => <li key={g.date} className="flex justify-between"><span>{g.date}</span><span>+{g.customers}</span></li>)}{growth.length === 0 && <li className="text-muted-foreground">No data yet.</li>}</ul></Card>
        <Card className="p-5"><h2 className="mb-3 text-lg">Top-selling products</h2><ol className="space-y-1 text-sm">{top.map((p, i) => <li key={p.id} className="flex justify-between gap-2"><span>{i + 1}. {p.name}</span><span className="text-muted-foreground">{p.soldCount} · {formatMoney(p.soldCount * p.priceCents)}</span></li>)}</ol></Card>
      </div>
    </div>
  );
}
