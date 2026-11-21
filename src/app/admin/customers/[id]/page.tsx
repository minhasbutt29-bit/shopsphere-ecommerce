import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { Card, StatusBadge } from "@/components/ui/misc";
import { CustomerActiveToggle } from "@/components/admin/customer-active-toggle";

export const metadata = { title: "Customer" };

export default async function AdminCustomer({ params }: { params: { id: string } }) {
  await requireAdmin();
  const c = await db.user.findFirst({
    where: { id: params.id, role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true, isActive: true, emailVerified: true, createdAt: true, addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, number: true, status: true, totalCents: true, currency: true, createdAt: true } } },
  });
  if (!c) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">{c.name ?? c.email}</h1><p className="text-sm text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""} · joined {c.createdAt.toLocaleDateString("en-US")} · {c.emailVerified ? "email verified" : "email not verified"}</p></div>
        <CustomerActiveToggle id={c.id} isActive={c.isActive} />
      </div>
      <Card className="overflow-x-auto"><h2 className="p-4 text-lg">Order history</h2>
        <table className="w-full text-sm"><tbody className="divide-y border-t">
          {c.orders.map((o) => <tr key={o.id}><td className="p-3"><Link className="font-medium hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link></td><td className="p-3">{o.createdAt.toLocaleDateString("en-US")}</td><td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3 text-right">{formatMoney(o.totalCents, o.currency)}</td></tr>)}
          {c.orders.length === 0 && <tr><td className="p-6 text-center text-muted-foreground">No orders.</td></tr>}
        </tbody></table></Card>
      <Card className="p-5"><h2 className="mb-3 text-lg">Addresses</h2>
        {c.addresses.length === 0 ? <p className="text-sm text-muted-foreground">None saved.</p> : <div className="grid gap-4 text-sm md:grid-cols-2">{c.addresses.map((a) => <p key={a.id}>{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city} {a.postalCode}, {a.country}</p>)}</div>}</Card>
    </div>
  );
}
