import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { featuredProducts, newArrivals, bestSellers, onSale, listCategories } from "@/services/products";
import { ProductGrid } from "@/components/store/product-card";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/store/reveal";

export const revalidate = 60;

const testimonials = [
  { q: "The merino sweater is the best I've owned. Arrived in two days and fits perfectly.", n: "Amelia R." },
  { q: "Checkout was effortless and the packaging felt genuinely premium.", n: "Daniel K." },
  { q: "Great quality for the price, and support answered within the hour.", n: "Sofia M." },
];

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container mt-20">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="text-3xl">{title}</h2>
        {href && <Link href={href} className="inline-flex items-center gap-1 text-sm hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const [featured, fresh, best, sale, categories, banners, wl] = await Promise.all([
    featuredProducts(4), newArrivals(4), bestSellers(4), onSale(4), listCategories(),
    db.banner.findMany({ where: { isActive: true }, orderBy: { position: "asc" }, take: 3 }),
    user ? db.wishlistItem.findMany({ where: { wishlist: { userId: user.id } }, select: { productId: true } }) : Promise.resolve([]),
  ]);
  const wished = wl.map((w) => w.productId);

  return (
    <>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="container grid min-h-[78vh] items-center gap-10 py-20 md:grid-cols-2">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.3em] opacity-70">New season</p>
            <h1 className="mt-4 text-5xl leading-[1.05] md:text-7xl">Considered essentials, made to last.</h1>
            <p className="mt-6 max-w-md text-lg opacity-80">Premium apparel, footwear and home goods. Timeless design, honest materials.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary"><Link href="/shop">Shop the collection</Link></Button>
              <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10"><Link href="/shop?sort=newest">New arrivals</Link></Button>
            </div>
          </Reveal>
          <div className="hidden aspect-[4/5] rounded-lg border border-white/10 bg-white/5 md:block" aria-hidden />
        </div>
      </section>

      <div className="container -mt-px grid gap-6 border-b py-6 text-sm md:grid-cols-3">
        {[[Truck, "Free shipping over $100"], [RotateCcw, "30-day easy returns"], [ShieldCheck, "Secure checkout"]].map(([Icon, t]) => {
          const I = Icon as typeof Truck;
          return <div key={t as string} className="flex items-center justify-center gap-3"><I className="h-5 w-5" aria-hidden />{t as string}</div>;
        })}
      </div>

      {banners.length > 0 && (
        <section className="container mt-12 grid gap-4 md:grid-cols-3" aria-label="Promotions">
          {banners.map((b) => (
            <Link key={b.id} href={b.ctaHref ?? "/shop"} className="rounded-lg bg-secondary p-8 transition hover:bg-muted">
              <h2 className="text-xl">{b.title}</h2>
              {b.subtitle && <p className="mt-2 text-sm text-muted-foreground">{b.subtitle}</p>}
              {b.ctaLabel && <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">{b.ctaLabel} <ArrowRight className="h-4 w-4" /></span>}
            </Link>
          ))}
        </section>
      )}

      <Section title="Shop by category">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className="group flex aspect-[4/3] flex-col justify-end rounded-lg bg-secondary p-5 transition hover:bg-muted">
              <h3 className="text-xl">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c._count.products} products</p>
            </Link>
          ))}
        </div>
      </Section>

      {featured.length > 0 && <Section title="Featured" href="/shop"><ProductGrid products={featured} wishedIds={wished} /></Section>}
      <Section title="New arrivals" href="/shop?sort=newest"><ProductGrid products={fresh} wishedIds={wished} /></Section>
      <Section title="Best sellers" href="/shop?sort=popular"><ProductGrid products={best} wishedIds={wished} /></Section>
      {sale.length > 0 && <Section title="Special offers"><ProductGrid products={sale} wishedIds={wished} /></Section>}

      <Section title="Loved by customers">
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.n} className="rounded-lg border p-6">
              <blockquote className="font-display text-lg leading-snug">“{t.q}”</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">{t.n}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <section className="container mt-20">
        <div className="rounded-lg bg-secondary px-6 py-16 text-center">
          <h2 className="text-3xl">Join the list</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">New arrivals, private sales and 10% off your first order with code WELCOME10.</p>
          <div className="mx-auto mt-6 max-w-md"><NewsletterForm /></div>
        </div>
      </section>
    </>
  );
}
