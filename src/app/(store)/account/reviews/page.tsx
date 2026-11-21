import Link from "next/link";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { ReviewForm } from "@/components/account/review-form";

export const metadata = { title: "My reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const user = await requireUser();
  const [reviews, purchased] = await Promise.all([
    db.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, slug: true } } } }),
    db.orderItem.findMany({
      where: { productId: { not: null }, order: { userId: user.id, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
      distinct: ["productId"], select: { productId: true, name: true },
    }),
  ]);
  const reviewed = new Set(reviews.map((r) => r.productId));
  const pending = purchased.filter((p) => p.productId && !reviewed.has(p.productId));

  return (
    <div className="space-y-10">
      <h1 className="text-3xl">My reviews</h1>
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl">Waiting for your review</h2>
          <div className="space-y-4">{pending.map((p) => <ReviewForm key={p.productId} productId={p.productId as string} name={p.name} />)}</div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl">Submitted</h2>
        {reviews.length === 0 ? <p className="text-sm text-muted-foreground">You haven't reviewed anything yet.</p> : (
          <ul className="divide-y rounded-lg border">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-1 p-4 text-sm">
                <div className="flex items-center justify-between"><Link href={`/product/${r.product.slug}`} className="font-medium hover:underline">{r.product.name}</Link><StatusBadge status={r.status} /></div>
                <p className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-muted-foreground/40"}`} aria-hidden />)}</p>
                {r.title && <p className="font-medium">{r.title}</p>}
                <p className="text-muted-foreground">{r.body}</p>
                {r.status === "PENDING" && <Badge>Awaiting moderation</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
