import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/verify-email";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default function VerifyPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <>
      <h1 className="text-3xl">Email verification</h1>
      {/* Verification runs on click (POST), so link scanners that prefetch emails can't consume the token. */}
      {searchParams.token ? <VerifyEmail token={searchParams.token} /> : <p className="mt-4 text-sm text-destructive">Missing verification token.</p>}
    </>
  );
}
