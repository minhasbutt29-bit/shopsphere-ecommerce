"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/confirm";
import { Field, Input, Select } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

type C = { id: string; code: string; type: "PERCENTAGE" | "FIXED"; value: number; minSubtotalCents: number; usageLimit: number | null; usedCount: number; expiresAt: string | null; isActive: boolean };

export function CouponManager({ coupons }: { coupons: C[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Min. order</th><th className="p-3">Used</th><th className="p-3">Expires</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-mono font-medium">{c.code}</td><td className="p-3">{c.type === "PERCENTAGE" ? `${c.value}%` : formatMoney(c.value)}</td>
                <td className="p-3">{c.minSubtotalCents ? formatMoney(c.minSubtotalCents) : "–"}</td><td className="p-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className="p-3">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-US") : "Never"}</td>
                <td className="p-3">{c.isActive ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>}</td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={async () => { await attempt(() => apiFetch(`/api/admin/coupons/${c.id}`, { method: "PATCH", json: { isActive: !c.isActive } }), c.isActive ? "Coupon disabled" : "Coupon enabled"); router.refresh(); }}>{c.isActive ? "Disable" : "Enable"}</Button>
                  <ConfirmButton title={`Delete ${c.code}?`} confirmLabel="Delete" onConfirm={async () => { await attempt(() => apiFetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" }), "Coupon deleted"); router.refresh(); }}><Trash2 className="h-4 w-4" aria-label={`Delete ${c.code}`} /></ConfirmButton>
                </div></td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Card className="h-fit p-5">
        <h2 className="mb-4 text-lg">New coupon</h2>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget; const fd = new FormData(form);
          setBusy(true);
          const ok = await attempt(() => apiFetch("/api/admin/coupons", { method: "POST", json: { code: fd.get("code"), type: fd.get("type"), value: fd.get("value"), minSubtotal: fd.get("minSubtotal") || 0, usageLimit: fd.get("usageLimit") || "", perUserLimit: fd.get("perUserLimit") || "", expiresAt: fd.get("expiresAt") || "", isActive: true } }), "Coupon created");
          setBusy(false);
          if (ok) { form.reset(); router.refresh(); }
        }}>
          <Field label="Code"><Input name="code" required pattern="[A-Za-z0-9_\-]{3,30}" className="uppercase" /></Field>
          <Field label="Type"><Select name="type"><option value="PERCENTAGE">Percentage (%)</option><option value="FIXED">Fixed amount ($)</option></Select></Field>
          <Field label="Value"><Input name="value" type="number" step="0.01" min="0.01" required /></Field>
          <Field label="Minimum order ($)"><Input name="minSubtotal" type="number" step="0.01" min="0" defaultValue={0} /></Field>
          <Field label="Total usage limit"><Input name="usageLimit" type="number" min="1" /></Field>
          <Field label="Uses per customer"><Input name="perUserLimit" type="number" min="1" defaultValue={1} /></Field>
          <Field label="Expires on"><Input name="expiresAt" type="date" /></Field>
          <Button type="submit" loading={busy} className="w-full">Create coupon</Button>
        </form>
      </Card>
    </div>
  );
}
