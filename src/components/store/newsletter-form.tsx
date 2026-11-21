"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await attempt(() => apiFetch("/api/newsletter", { method: "POST", json: { email } }), "You're subscribed. Welcome!");
        if (ok) setEmail("");
        setBusy(false);
      }}
      className="flex gap-2"
    >
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email address" />
      <Button type="submit" loading={busy}>Subscribe</Button>
    </form>
  );
}
