import { requireAdmin } from "@/lib/authz";
import { getSettings } from "@/services/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl">Store settings</h1>
      <SettingsForm s={{ storeName: s.storeName, contactEmail: s.contactEmail, contactPhone: s.contactPhone ?? "", address: s.address ?? "", currency: s.currency, shippingFlat: s.shippingFlatCents / 100, expressShipping: s.expressShippingCents / 100, freeShippingOver: s.freeShippingOverCents / 100, taxRatePercent: s.taxRateBps / 100, lowStockEmail: s.lowStockEmail ?? "", notifyNewOrders: s.notifyNewOrders }} />
    </div>
  );
}
