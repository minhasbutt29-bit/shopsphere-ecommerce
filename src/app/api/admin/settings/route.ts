import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { settingsSchema } from "@/validation/schemas";
import { toCents } from "@/lib/money";
import { getSettings } from "@/services/settings";

export const GET = api(async () => {
  await requireAdminApi();
  return NextResponse.json({ settings: await getSettings() });
});

export const PUT = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const d = settingsSchema.parse(await req.json());
  const settings = await db.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {
      storeName: d.storeName, contactEmail: d.contactEmail, contactPhone: d.contactPhone || null, address: d.address || null, currency: d.currency,
      shippingFlatCents: toCents(d.shippingFlat), expressShippingCents: toCents(d.expressShipping), freeShippingOverCents: toCents(d.freeShippingOver),
      taxRateBps: Math.round(d.taxRatePercent * 100), lowStockEmail: d.lowStockEmail || null, notifyNewOrders: d.notifyNewOrders,
    },
  });
  await logAdminActivity({ actorId: admin.id, action: "settings.update", entity: "StoreSettings", entityId: "singleton" });
  return NextResponse.json({ settings });
});
