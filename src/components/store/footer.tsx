import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

const cols = [
  { title: "Shop", links: [["All products", "/shop"], ["New arrivals", "/shop?sort=newest"], ["Best sellers", "/shop?sort=popular"], ["Compare", "/compare"]] },
  { title: "Help", links: [["Contact", "/contact"], ["FAQ", "/faq"], ["Shipping", "/shipping-policy"], ["Returns & refunds", "/returns-policy"]] },
  { title: "Company", links: [["About us", "/about"], ["Privacy policy", "/privacy"], ["Terms & conditions", "/terms"], ["My account", "/account"]] },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-secondary/50">
      <div className="container grid gap-12 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="font-display text-xl font-semibold uppercase tracking-[0.18em]">ShopSphere</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Considered essentials for everyday life: made well, priced fairly, delivered fast.</p>
          <div className="mt-6 max-w-sm"><NewsletterForm /></div>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="font-sans text-sm font-semibold">{c.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {c.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-foreground">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} ShopSphere. All rights reserved.</div>
    </footer>
  );
}
