import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { Badge, Card, ProductImage } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { CsvImport } from "@/components/admin/csv-import";

export const metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdmin();
  const q = searchParams.q?.trim();
  const products = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" }, take: 200, include: { category: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" } } },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Products</h1>
        <div className="flex gap-2"><CsvImport /><Button asChild><Link href="/admin/products/new"><Plus className="h-4 w-4" /> New product</Link></Button></div>
      </div>
      <form className="max-w-sm"><input name="q" defaultValue={q} placeholder="Search name or SKU" aria-label="Search products" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></form>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Category</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><div className="flex items-center gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary"><ProductImage src={p.images[0]?.url} alt={p.name} className="text-sm" /></div><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link></div></td>
                <td className="p-3 text-muted-foreground">{p.sku}</td><td className="p-3">{p.category?.name ?? "–"}</td>
                <td className="p-3 text-right">{formatMoney(p.salePriceCents ?? p.priceCents)}</td>
                <td className={`p-3 text-right ${p.stock <= p.lowStockAt ? "font-medium text-destructive" : ""}`}>{p.stock}</td>
                <td className="p-3"><div className="flex gap-1">{p.isPublished ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}{p.isFeatured && <Badge tone="info">Featured</Badge>}</div></td>
                <td className="p-3 text-right"><ProductRowActions id={p.id} name={p.name} isPublished={p.isPublished} isFeatured={p.isFeatured} /></td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No products found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
