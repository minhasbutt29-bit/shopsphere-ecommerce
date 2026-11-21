import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { Card } from "@/components/ui/misc";
import { BannerManager } from "@/components/admin/banner-manager";

export const metadata = { title: "Website" };

export default async function AdminWebsite() {
  await requireAdmin();
  const [banners, featured, subs, subCount] = await Promise.all([
    db.banner.findMany({ orderBy: { position: "asc" } }),
    db.product.findMany({ where: { isFeatured: true }, select: { id: true, name: true } }),
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.newsletterSubscriber.count({ where: { isActive: true } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Website</h1>
      <section><h2 className="mb-3 text-xl">Homepage promotions</h2>
        <BannerManager banners={banners.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel, ctaHref: b.ctaHref, position: b.position, isActive: b.isActive }))} /></section>
      <section><h2 className="mb-3 text-xl">Featured products</h2>
        <Card className="p-5 text-sm">{featured.length === 0 ? "No featured products." : <ul className="flex flex-wrap gap-2">{featured.map((f) => <li key={f.id} className="rounded-full bg-muted px-3 py-1">{f.name}</li>)}</ul>}
          <p className="mt-3 text-muted-foreground">Toggle the star on the <Link href="/admin/products" className="underline">products list</Link> to change what appears on the homepage.</p></Card></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl">Newsletter subscribers ({subCount} active)</h2><a className="text-sm underline" href="/api/admin/newsletter/export">Export CSV</a></div>
        <Card className="max-h-96 overflow-auto"><table className="w-full text-sm"><tbody className="divide-y">{subs.map((s) => <tr key={s.id}><td className="p-3">{s.email}</td><td className="p-3 text-muted-foreground">{s.createdAt.toLocaleDateString("en-US")}</td><td className="p-3 text-right text-muted-foreground">{s.isActive ? "Active" : "Unsubscribed"}</td></tr>)}</tbody></table></Card></section>
    </div>
  );
}
