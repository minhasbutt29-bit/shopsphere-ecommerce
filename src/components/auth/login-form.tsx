"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" loading={pending}>Sign in</Button>;
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useFormState(loginAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password"><Input name="password" type="password" required autoComplete="current-password" /></Field>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Submit />
      <p className="text-right text-sm"><Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link></p>
    </form>
  );
}
