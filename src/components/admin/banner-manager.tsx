"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/confirm";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

type B = { id: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; position: number; isActive: boolean };

export function BannerManager({ banners }: { banners: B[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="divide-y">
        {banners.map((b) => (
          <div key={b.id} className="flex items-start justify-between gap-3 p-4 text-sm">
            <div><p className="font-medium">{b.title}</p>{b.subtitle && <p className="text-muted-foreground">{b.subtitle}</p>}<p className="mt-1 text-xs text-muted-foreground">{b.ctaLabel ?? "No button"} → {b.ctaHref ?? "/shop"} · position {b.position}</p></div>
            <ConfirmButton title="Delete this promotion?" confirmLabel="Delete" onConfirm={async () => { await attempt(() => apiFetch("/api/admin/banners", { method: "DELETE", json: { id: b.id } }), "Promotion deleted"); router.refresh(); }}><Trash2 className="h-4 w-4" aria-label="Delete promotion" /></ConfirmButton>
          </div>
        ))}
        {banners.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No promotions.</p>}
      </Card>
      <Card className="h-fit p-5">
        <h3 className="mb-3 font-sans text-base font-medium">New promotion</h3>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget; const fd = new FormData(form);
          setBusy(true);
          // The homepage renders promotions as text cards; `image` only needs to be a valid URL placeholder.
          const ok = await attempt(() => apiFetch("/api/admin/banners", { method: "POST", json: { title: fd.get("title"), subtitle: fd.get("subtitle"), image: `${window.location.origin}/`, ctaLabel: fd.get("ctaLabel"), ctaHref: fd.get("ctaHref"), position: fd.get("position") || 0, isActive: true } }), "Promotion created");
          setBusy(false);
          if (ok) { form.reset(); router.refresh(); }
        }}>
          <Field label="Title"><Input name="title" required /></Field><Field label="Subtitle"><Input name="subtitle" /></Field>
          <Field label="Button label"><Input name="ctaLabel" /></Field><Field label="Button link" hint="Path such as /shop?sort=newest"><Input name="ctaHref" /></Field>
          <Field label="Position"><Input name="position" type="number" min={0} defaultValue={0} /></Field>
          <Button type="submit" loading={busy} className="w-full">Add promotion</Button>
        </form>
      </Card>
    </div>
  );
}
