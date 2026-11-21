import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { Card, StatusBadge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

export const metadata = { title: "Orders" };
const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function AdminOrders({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  await requireAdmin();
  const q = searchParams.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(searchParams.status && STATUSES.includes(searchParams.status) ? { status: searchParams.status as OrderStatus } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { payment: true } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Orders</h1>
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Order number or email" className="max-w-xs" aria-label="Search orders" />
        <Select name="status" defaultValue={searchParams.status ?? ""} className="w-44" aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}</Select>
        <Button type="submit">Filter</Button>
      </form>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3 text-right">Total</th></tr></thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="p-3"><Link className="font-medium hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                <td className="p-3">{o.createdAt.toLocaleDateString("en-US")}</td><td className="p-3">{o.email}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3">{o.payment?.method === "COD" ? "COD" : "Card"} · <StatusBadge status={o.payment?.status ?? "PENDING"} /></td>
                <td className="p-3 text-right">{formatMoney(o.totalCents, o.currency)}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No orders match.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
