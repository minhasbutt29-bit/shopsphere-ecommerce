import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { Card } from "@/components/ui/misc";
import { ReviewRow } from "@/components/admin/review-row";

export const metadata = { title: "Reviews" };

export default async function AdminReviews() {
  await requireAdmin();
  const reviews = await db.review.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200, include: { product: { select: { name: true } }, user: { select: { name: true, email: true } } } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Reviews</h1>
      <Card className="divide-y">
        {reviews.map((r) => <ReviewRow key={r.id} id={r.id} status={r.status} rating={r.rating} title={r.title} body={r.body} product={r.product.name} author={r.user.name ?? r.user.email} />)}
        {reviews.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No reviews yet.</p>}
      </Card>
    </div>
  );
}
