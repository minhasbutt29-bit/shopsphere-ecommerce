"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function PasswordForm() {
  const [busy, setBusy] = React.useState(false);
  return (
    <form className="mt-6 space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      setBusy(true);
      const ok = await attempt(() => apiFetch("/api/account/password", { method: "POST", json: { currentPassword: fd.get("current"), newPassword: fd.get("next") } }), "Password changed");
      if (ok) form.reset();
      setBusy(false);
    }}>
      <Field label="Current password"><Input name="current" type="password" required autoComplete="current-password" /></Field>
      <Field label="New password" hint="At least 10 characters with upper, lower case and a number."><Input name="next" type="password" required minLength={10} autoComplete="new-password" /></Field>
      <Button type="submit" loading={busy}>Update password</Button>
    </form>
  );
}
