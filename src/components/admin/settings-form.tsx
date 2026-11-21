"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

type S = { storeName: string; contactEmail: string; contactPhone: string; address: string; currency: string; shippingFlat: number; expressShipping: number; freeShippingOver: number; taxRatePercent: number; lowStockEmail: string; notifyNewOrders: boolean };

export function SettingsForm({ s }: { s: S }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      setBusy(true);
      await attempt(() => apiFetch("/api/admin/settings", { method: "PUT", json: {
        storeName: fd.get("storeName"), contactEmail: fd.get("contactEmail"), contactPhone: fd.get("contactPhone"), address: fd.get("address"), currency: fd.get("currency"),
        shippingFlat: fd.get("shippingFlat"), expressShipping: fd.get("expressShipping"), freeShippingOver: fd.get("freeShippingOver"), taxRatePercent: fd.get("taxRatePercent"),
        lowStockEmail: fd.get("lowStockEmail"), notifyNewOrders: fd.get("notifyNewOrders") === "on",
      } }), "Settings saved");
      setBusy(false); router.refresh();
    }}>
      <Field label="Store name"><Input name="storeName" required defaultValue={s.storeName} /></Field>
      <Field label="Currency (ISO code)" hint="Stripe-supported lowercase code, e.g. usd"><Input name="currency" required maxLength={3} minLength={3} defaultValue={s.currency} /></Field>
      <Field label="Contact email"><Input name="contactEmail" type="email" required defaultValue={s.contactEmail} /></Field>
      <Field label="Contact phone"><Input name="contactPhone" defaultValue={s.contactPhone} /></Field>
      <div className="sm:col-span-2"><Field label="Address"><Input name="address" defaultValue={s.address} /></Field></div>
      <Field label="Standard shipping ($)"><Input name="shippingFlat" type="number" step="0.01" min="0" defaultValue={s.shippingFlat} /></Field>
      <Field label="Express shipping ($)"><Input name="expressShipping" type="number" step="0.01" min="0" defaultValue={s.expressShipping} /></Field>
      <Field label="Free standard shipping over ($)" hint="0 disables free shipping."><Input name="freeShippingOver" type="number" step="0.01" min="0" defaultValue={s.freeShippingOver} /></Field>
      <Field label="Tax rate (%)"><Input name="taxRatePercent" type="number" step="0.01" min="0" max="50" defaultValue={s.taxRatePercent} /></Field>
      <div className="sm:col-span-2"><Field label="Low-stock alert email" hint="Leave empty to disable alerts."><Input name="lowStockEmail" type="email" defaultValue={s.lowStockEmail} /></Field></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="notifyNewOrders" defaultChecked={s.notifyNewOrders} /> Notify me about new orders</label>
      <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save settings</Button></div>
    </form>
  );
}
