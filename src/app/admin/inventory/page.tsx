import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { lowStockProducts } from "@/services/inventory";
import { Badge, Card } from "@/components/ui/misc";
import { StockAdjustForm } from "@/components/admin/stock-adjust-form";

export const metadata = { title: "Inventory" };

export default async function AdminInventory() {
  await requireAdmin();
  const [products, low, movements] = await Promise.all([
    db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, stock: true, lowStockAt: true, variants: { select: { id: true, sku: true, size: true, color: true, stock: true } } } }),
    lowStockProducts(),
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { product: { select: { name: true } } } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Inventory</h1>
      {low.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30" role="alert">
          <h2 className="text-lg">Low-stock alerts ({low.length})</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">{low.map((p) => <li key={p.id}><Badge tone="warning">{p.name}: {p.stock} left</Badge></li>)}</ul>
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit p-5"><h2 className="mb-4 text-lg">Adjust stock</h2><StockAdjustForm products={products} /></Card>
        <Card className="overflow-x-auto"><h2 className="p-4 text-lg">Movement history</h2>
          <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">When</th><th className="p-3">Product</th><th className="p-3">Type</th><th className="p-3 text-right">Change</th><th className="p-3 text-right">Stock after</th><th className="p-3">Note</th></tr></thead>
            <tbody className="divide-y">{movements.map((m) => (
              <tr key={m.id}><td className="p-3 whitespace-nowrap">{m.createdAt.toLocaleString("en-US")}</td><td className="p-3">{m.product.name}</td><td className="p-3"><Badge>{m.type.toLowerCase()}</Badge></td>
                <td className={`p-3 text-right font-medium ${m.change < 0 ? "text-destructive" : "text-emerald-600"}`}>{m.change > 0 ? `+${m.change}` : m.change}</td><td className="p-3 text-right">{m.stockAfter}</td><td className="p-3 text-muted-foreground">{m.note ?? ""}</td></tr>
            ))}{movements.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No movements yet.</td></tr>}</tbody></table>
        </Card>
      </div>
    </div>
  );
}
