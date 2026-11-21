import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { toCsv } from "@/lib/utils";

export const GET = api(async () => {
  const admin = await requireAdminApi();
  const subs = await db.newsletterSubscriber.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  await logAdminActivity({ actorId: admin.id, action: "newsletter.export", entity: "NewsletterSubscriber" });
  return new Response(toCsv(subs.map((s) => ({ email: s.email, subscribedAt: s.createdAt.toISOString() }))), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="subscribers.csv"' },
  });
});
