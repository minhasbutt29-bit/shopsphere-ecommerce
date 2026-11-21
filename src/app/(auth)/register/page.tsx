import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-3xl">Create your account</h1>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">Already registered? <Link href="/login" className="text-foreground underline">Sign in</Link></p>
    </>
  );
}
