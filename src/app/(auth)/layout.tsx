import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-10 font-display text-2xl font-semibold uppercase tracking-[0.18em]">ShopSphere</Link>
      <div className="w-full max-w-md rounded-lg border bg-card p-8">{children}</div>
    </div>
  );
}
