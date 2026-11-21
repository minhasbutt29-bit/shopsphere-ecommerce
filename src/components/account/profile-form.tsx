"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function ProfileForm({ name, email, phone, newsletter }: { name: string; email: string; phone: string; newsletter: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <form className="mt-6 space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      setBusy(true);
      await attempt(() => apiFetch("/api/account/profile", { method: "PATCH", json: { name: fd.get("name"), phone: fd.get("phone"), newsletter: fd.get("newsletter") === "on" } }), "Profile updated");
      setBusy(false);
      router.refresh();
    }}>
      <Field label="Full name"><Input name="name" defaultValue={name} required minLength={2} /></Field>
      <Field label="Email" hint="Email can't be changed here."><Input value={email} disabled readOnly /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={phone} autoComplete="tel" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newsletter" defaultChecked={newsletter} /> Subscribe to the newsletter</label>
      <Button type="submit" loading={busy}>Save changes</Button>
    </form>
  );
}
