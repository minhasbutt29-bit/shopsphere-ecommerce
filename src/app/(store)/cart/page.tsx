import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/authz";
import { getCartLines } from "@/services/cart";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CartView } from "@/components/store/cart-view";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Your cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container max-w-xl py-24">
        <EmptyState title="Sign in to view your cart" description="Your cart is saved to your account so it follows you across devices." action={<Button asChild><Link href="/login?callbackUrl=/cart">Sign in</Link></Button>} />
      </div>
    );
  }
  const [cart, settings] = await Promise.all([getCartLines(user.id), getSettings()]);
  return (
    <div className="container py-10">
      <h1 className="text-4xl">Your cart</h1>
      {cart.lines.length === 0 ? (
        <div className="mt-8"><EmptyState title="Your cart is empty" description="Discover something you'll love." action={<Button asChild><Link href="/shop">Start shopping</Link></Button>} /></div>
      ) : (
        <CartView lines={cart.lines} subtotalCents={cart.subtotalCents} flatShippingCents={settings.shippingFlatCents} freeOverCents={settings.freeShippingOverCents} />
      )}
    </div>
  );
}
