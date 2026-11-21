"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, attempt } from "@/lib/client-api";

export function VerifyEmail({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-muted-foreground">Confirm to activate your account.</p>
      <Button className="w-full" loading={busy} onClick={async () => { setBusy(true); if (await attempt(() => apiFetch("/api/auth/verify-email", { method: "POST", json: { token } }))) router.push("/login?verified=1"); setBusy(false); }}>Verify my email</Button>
    </div>
  );
}
