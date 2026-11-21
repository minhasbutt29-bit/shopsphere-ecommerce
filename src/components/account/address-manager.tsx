"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/confirm";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

type Address = { id: string; label: string | null; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string | null; postalCode: string; country: string; isDefault: boolean };

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="mt-6 space-y-6">
      {addresses.length === 0 && !open && <EmptyState title="No saved addresses" description="Add one to speed up checkout." />}
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <Card key={a.id} className="p-5 text-sm">
            <div className="flex items-start justify-between">
              <p className="font-medium">{a.label || a.fullName} {a.isDefault && <Badge className="ml-2">Default</Badge>}</p>
              <ConfirmButton title="Delete this address?" confirmLabel="Delete" onConfirm={async () => { await attempt(() => apiFetch("/api/account/addresses", { method: "DELETE", json: { id: a.id } }), "Address deleted"); router.refresh(); }}><Trash2 className="h-4 w-4" aria-label="Delete address" /></ConfirmButton>
            </div>
            <p className="mt-2 text-muted-foreground">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode}<br />{a.country}<br />{a.phone}</p>
          </Card>
        ))}
      </div>
      {!open ? <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add address</Button> : (
        <form className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setBusy(true);
          const ok = await attempt(() => apiFetch("/api/account/addresses", { method: "POST", json: { label: fd.get("label"), fullName: fd.get("fullName"), phone: fd.get("phone"), line1: fd.get("line1"), line2: fd.get("line2"), city: fd.get("city"), state: fd.get("state"), postalCode: fd.get("postalCode"), country: fd.get("country"), isDefault: fd.get("isDefault") === "on" } }), "Address saved");
          setBusy(false);
          if (ok) { setOpen(false); router.refresh(); }
        }}>
          <Field label="Label (e.g. Home)"><Input name="label" /></Field>
          <Field label="Full name"><Input name="fullName" required /></Field>
          <Field label="Phone"><Input name="phone" required /></Field>
          <Field label="Address"><Input name="line1" required /></Field>
          <Field label="Apartment, suite"><Input name="line2" /></Field>
          <Field label="City"><Input name="city" required /></Field>
          <Field label="State / Province"><Input name="state" /></Field>
          <Field label="Postal code"><Input name="postalCode" required /></Field>
          <Field label="Country"><Input name="country" required /></Field>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isDefault" /> Make default</label>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Save address</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button></div>
        </form>
      )}
    </div>
  );
}
