import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata = { title: "Coupons" };

export default async function AdminCoupons() {
  await requireAdmin();
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Discounts & coupons</h1>
      <CouponManager coupons={coupons.map((c) => ({ id: c.id, code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents, usageLimit: c.usageLimit, usedCount: c.usedCount, expiresAt: c.expiresAt?.toISOString() ?? null, isActive: c.isActive }))} />
    </div>
  );
}
