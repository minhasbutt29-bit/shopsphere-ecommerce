"use client";
import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="md:hidden">
      <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"><Menu className="h-5 w-5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 bg-background" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <div className="flex h-16 items-center justify-between px-5">
            <span className="font-display text-xl font-semibold uppercase tracking-[0.18em]">ShopSphere</span>
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-6 w-6" /></button>
          </div>
          <nav aria-label="Mobile" className="flex flex-col gap-1 px-5 pt-6">
            {[...links, { href: "/account", label: "My account" }, { href: "/compare", label: "Compare" }].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b py-4 font-display text-2xl">{l.label}</Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
