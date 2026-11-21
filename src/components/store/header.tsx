import Link from "next/link";
import { Heart, ShoppingBag, User, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?sort=newest", label: "New" },
  { href: "/shop?sort=popular", label: "Best sellers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function Header() {
  const user = await getCurrentUser();
  const count = user
    ? (await db.cartItem.aggregate({ where: { cart: { userId: user.id } }, _sum: { quantity: true } }))._sum.quantity ?? 0
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="bg-primary px-4 py-1.5 text-center text-xs tracking-wide text-primary-foreground">Free standard shipping on orders over $100</div>
      <div className="container flex h-16 items-center gap-4">
        <MobileNav links={NAV} />
        <Link href="/" className="font-display text-xl font-semibold uppercase tracking-[0.18em]">ShopSphere</Link>
        <nav aria-label="Main" className="ml-6 hidden gap-6 text-sm md:flex">
          {NAV.slice(0, 3).map((n) => <Link key={n.href} href={n.href} className="text-muted-foreground transition-colors hover:text-foreground">{n.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchBox />
          <ThemeToggle />
          {user?.role === "ADMIN" && (
            <Link href="/admin" aria-label="Admin dashboard" className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"><Shield className="h-5 w-5" /></Link>
          )}
          <Link href={user ? "/account/wishlist" : "/login"} aria-label="Wishlist" className="hidden h-10 w-10 items-center justify-center rounded-md hover:bg-muted sm:inline-flex"><Heart className="h-5 w-5" /></Link>
          <Link href={user ? "/account" : "/login"} aria-label={user ? "My account" : "Sign in"} className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"><User className="h-5 w-5" /></Link>
          <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
