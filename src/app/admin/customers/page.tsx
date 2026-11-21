import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { Badge, Card } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export const metadata = { title: "Customers" };

export default async function AdminCustomers({ searchParams }: { searchParams: { q?: string } }) {
  await requireAdmin();
  const q = searchParams.q?.trim();
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, name: true, email: true, isActive: true, createdAt: true, _count: { select: { orders: true } } }, // never selects passwordHash
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Customers</h1>
      <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Name or email" className="max-w-xs" aria-label="Search customers" /><Button type="submit">Search</Button></form>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Joined</th><th className="p-3 text-right">Orders</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y">
            {customers.map((c) => (
              <tr key={c.id}><td className="p-3"><Link className="font-medium hover:underline" href={`/admin/customers/${c.id}`}>{c.name ?? "–"}</Link></td><td className="p-3">{c.email}</td><td className="p-3">{c.createdAt.toLocaleDateString("en-US")}</td><td className="p-3 text-right">{c._count.orders}</td><td className="p-3">{c.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</td></tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No customers found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
