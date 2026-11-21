"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); if (await attempt(() => apiFetch("/api/auth/reset-password", { method: "POST", json: { token, password } }))) router.push("/login?reset=1"); setBusy(false); }}>
      <Field label="New password" hint="At least 10 characters with upper, lower case and a number."><Input type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
      <Button type="submit" className="w-full" loading={busy}>Update password</Button>
    </form>
  );
}
