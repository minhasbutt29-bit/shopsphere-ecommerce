import Link from "next/link";
import { LayoutDashboard, User, Package, Heart, MapPin, Star, Lock, LogOut } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/profile", label: "My profile", icon: User },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/account/wishlist", label: "My wishlist", icon: Heart },
  { href: "/account/addresses", label: "My addresses", icon: MapPin },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/security", label: "Account security", icon: Lock },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
      <aside>
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="truncate font-medium">{user.name ?? user.email}</p>
        <nav aria-label="Account" className="mt-6 flex gap-1 overflow-x-auto lg:flex-col">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-muted"><Icon className="h-4 w-4" aria-hidden />{label}</Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-6"><Button type="submit" variant="outline" size="sm"><LogOut className="h-4 w-4" /> Sign out</Button></form>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
