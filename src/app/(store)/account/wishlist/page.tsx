import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { productsByIds } from "@/services/products";

export const metadata = { title: "My wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUser();
  const items = await db.wishlistItem.findMany({ where: { wishlist: { userId: user.id } }, orderBy: { createdAt: "desc" }, select: { productId: true } });
  const products = await productsByIds(items.map((i) => i.productId));
  return (
    <div>
      <h1 className="text-3xl">My wishlist</h1>
      <div className="mt-6">
        {products.length === 0 ? <EmptyState title="Your wishlist is empty" description="Tap the heart on any product to save it here." action={<Button asChild><Link href="/shop">Browse products</Link></Button>} /> : <ProductGrid products={products} wishedIds={products.map((p) => p.id)} />}
      </div>
    </div>
  );
}
