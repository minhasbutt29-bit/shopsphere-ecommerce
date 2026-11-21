import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <>
      <h1 className="text-3xl">Choose a new password</h1>
      {searchParams.token ? <ResetForm token={searchParams.token} /> : <p className="mt-4 text-sm text-destructive">This reset link is missing its token. Request a new one.</p>}
    </>
  );
}
