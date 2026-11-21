"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";
import { passwordSchema } from "@/validation/schemas";

const schema = z.object({ name: z.string().trim().min(2, "Enter your name"), email: z.string().email(), password: passwordSchema, newsletter: z.boolean() });
type V = z.infer<typeof schema>;

export function RegisterForm() {
  const [done, setDone] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { newsletter: false } });

  if (done) {
    return (
      <div className="mt-6 text-center" role="status">
        <MailCheck className="mx-auto h-10 w-10" aria-hidden />
        <p className="mt-4 font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-foreground">If the address is valid, we've sent a verification link. Verify your email to sign in.</p>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(async (v) => { if (await attempt(() => apiFetch("/api/auth/register", { method: "POST", json: v }))) setDone(true); })} className="mt-6 space-y-4" noValidate>
      <Field label="Full name" error={errors.name?.message}><Input autoComplete="name" {...register("name")} /></Field>
      <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register("email")} /></Field>
      <Field label="Password" error={errors.password?.message} hint="At least 10 characters with upper, lower case and a number."><Input type="password" autoComplete="new-password" {...register("password")} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("newsletter")} /> Email me news and offers</label>
      <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
    </form>
  );
}
