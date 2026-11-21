import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { toCsv } from "@/lib/utils";
import { revenueSeries, customerGrowth } from "@/services/analytics";

export const GET = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const type = new URL(req.url).searchParams.get("type");
  const since = new Date(Date.now() - 365 * 86_400_000);
  let rows: Record<string, unknown>[];

  switch (type) {
    case "orders":
      rows = (await db.order.findMany({ orderBy: { createdAt: "desc" }, take: 10_000 })).map((o) => ({ number: o.number, date: o.createdAt.toISOString(), email: o.email, status: o.status, subtotal: o.subtotalCents / 100, discount: o.discountCents / 100, shipping: o.shippingCents / 100, tax: o.taxCents / 100, total: o.totalCents / 100 }));
      break;
    case "revenue-daily": rows = await revenueSeries("day", since); break;
    case "revenue-monthly": rows = await revenueSeries("month", since); break;
    case "revenue-yearly": rows = await revenueSeries("year", new Date("2000-01-01")); break;
    case "top-products":
      rows = (await db.product.findMany({ orderBy: { soldCount: "desc" }, take: 100 })).map((p) => ({ name: p.name, sku: p.sku, sold: p.soldCount, stock: p.stock }));
      break;
    case "customer-growth": rows = await customerGrowth(since); break;
    case "inventory":
      rows = (await db.product.findMany({ orderBy: { name: "asc" } })).map((p) => ({ name: p.name, sku: p.sku, stock: p.stock, lowStockAt: p.lowStockAt }));
      break;
    default: throw new HttpError(400, "Unknown report type");
  }
  await logAdminActivity({ actorId: admin.id, action: "report.export", entity: "Report", meta: { type } });
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
