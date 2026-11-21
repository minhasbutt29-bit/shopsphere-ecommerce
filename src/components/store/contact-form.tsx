"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

export function ContactForm() {
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        const ok = await attempt(() => apiFetch("/api/contact", { method: "POST", json: { name: fd.get("name"), email: fd.get("email"), message: fd.get("message") } }), "Message sent. We'll be in touch.");
        if (ok) form.reset();
        setBusy(false);
      }}
    >
      <Field label="Name"><Input name="name" required minLength={2} autoComplete="name" /></Field>
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Message"><Textarea name="message" required minLength={10} maxLength={2000} /></Field>
      <Button type="submit" loading={busy}>Send message</Button>
    </form>
  );
}
