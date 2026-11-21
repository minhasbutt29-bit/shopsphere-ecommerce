"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function ForgotForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  if (sent) return <p className="mt-6 text-sm" role="status">If an account exists for that email, a reset link is on its way.</p>;
  return (
    <form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); if (await attempt(() => apiFetch("/api/auth/forgot-password", { method: "POST", json: { email } }))) setSent(true); setBusy(false); }}>
      <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
      <Button type="submit" className="w-full" loading={busy}>Send reset link</Button>
    </form>
  );
}
