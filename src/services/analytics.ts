import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { lowStockProducts } from "./inventory";

const REVENUE_STATUSES: Prisma.OrderWhereInput["status"] = { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] };

export type Granularity = "day" | "month" | "year";

export async function revenueSeries(granularity: Granularity, since: Date) {
  const unit = Prisma.raw(`'${granularity === "day" ? "day" : granularity === "month" ? "month" : "year"}'`); // whitelisted literal
  const rows = await db.$queryRaw<{ bucket: Date; revenue: number; orders: number }[]>(Prisma.sql`
    SELECT date_trunc(${unit}, "createdAt") AS bucket,
           COALESCE(SUM("totalCents"), 0)::int AS revenue,
           COUNT(*)::int AS orders
    FROM "Order"
    WHERE "status" IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED') AND "createdAt" >= ${since}
    GROUP BY 1 ORDER BY 1`);
  return rows.map((r) => ({ date: r.bucket.toISOString().slice(0, 10), revenue: r.revenue / 100, orders: r.orders }));
}

export async function customerGrowth(since: Date) {
  const rows = await db.$queryRaw<{ bucket: Date; customers: number }[]>(Prisma.sql`
    SELECT date_trunc('month', "createdAt") AS bucket, COUNT(*)::int AS customers
    FROM "User" WHERE "role" = 'CUSTOMER' AND "createdAt" >= ${since}
    GROUP BY 1 ORDER BY 1`);
  return rows.map((r) => ({ date: r.bucket.toISOString().slice(0, 7), customers: r.customers }));
}

export async function dashboardStats() {
  const [revenue, totalOrders, customers, products, pending, completed, lowStock, recentOrders, top] = await Promise.all([
    db.order.aggregate({ where: { status: REVENUE_STATUSES }, _sum: { totalCents: true } }),
    db.order.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "DELIVERED" } }),
    lowStockProducts(),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.product.findMany({ orderBy: { soldCount: "desc" }, take: 5, select: { id: true, name: true, soldCount: true, priceCents: true } }),
  ]);
  return {
    revenueCents: revenue._sum.totalCents ?? 0,
    totalOrders,
    customers,
    products,
    pending,
    completed,
    lowStock,
    recentOrders,
    top,
  };
}

export async function statusBreakdown() {
  const rows = await db.order.groupBy({ by: ["status"], _count: true });
  return rows.map((r) => ({ status: r.status, count: r._count }));
}
