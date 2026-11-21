import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";
import { renderInvoiceHtml } from "@/services/invoice";

export const GET = api(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserApi();
  const owned = await db.order.findFirst({
    where: { id: params.id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
    select: { id: true },
  });
  if (!owned) throw new HttpError(404, "Order not found");
  const html = await renderInvoiceHtml(owned.id);
  if (!html) throw new HttpError(404, "Order not found");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" } });
});
