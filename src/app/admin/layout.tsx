import Link from "next/link";
import { BarChart3, Boxes, FolderTree, Globe, LayoutDashboard, LogOut, MessageSquare, Package, Percent, Receipt, ScrollText, Settings, Users, Warehouse } from "lucide-react";
import { requireAdmin } from "@/lib/authz";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/store/theme-toggle";

export const metadata = { title: { default: "Admin", template: "%s | ShopSphere Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/coupons", label: "Coupons", icon: Percent },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/website", label: "Website", icon: Globe },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/activity", label: "Activity log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin(); // server-side gate: non-admins get 404, anonymous users are sent to login
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b bg-card lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-[0.15em]"><Boxes className="h-5 w-5" aria-hidden /> Admin</Link>
          <div className="lg:hidden"><ThemeToggle /></div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-muted"><Icon className="h-4 w-4" aria-hidden />{label}</Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← View storefront</Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{admin.email}</span>
            <div className="hidden lg:block"><ThemeToggle /></div>
            <form action={logoutAction}><Button type="submit" variant="outline" size="sm"><LogOut className="h-4 w-4" /> Sign out</Button></form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
