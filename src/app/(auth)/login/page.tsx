import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; verified?: string; reset?: string } }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/account");
  return (
    <>
      <h1 className="text-3xl">Welcome back</h1>
      {searchParams.verified && <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" role="status">Email verified. You can sign in now.</p>}
      {searchParams.reset && <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" role="status">Password updated. Please sign in.</p>}
      <LoginForm callbackUrl={searchParams.callbackUrl} />
      <p className="mt-6 text-center text-sm text-muted-foreground">New here? <Link href="/register" className="text-foreground underline">Create an account</Link></p>
    </>
  );
}
