"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function AdminCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget; const fd = new FormData(form);
      setBusy(true);
      const ok = await attempt(() => apiFetch("/api/admin/users", { method: "POST", json: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") } }), "Administrator created");
      setBusy(false);
      if (ok) { form.reset(); router.refresh(); }
    }}>
      <Field label="Name"><Input name="name" required /></Field>
      <Field label="Email"><Input name="email" type="email" required /></Field>
      <Field label="Temporary password" hint="10+ characters with upper, lower case and a number."><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
      <Button type="submit" loading={busy}>Create administrator</Button>
    </form>
  );
}
