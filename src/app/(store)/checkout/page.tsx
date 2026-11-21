import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { getCartLines } from "@/services/cart";
import { getSettings } from "@/services/settings";
import { stripeConfigured } from "@/lib/stripe";
import { CheckoutForm } from "@/components/store/checkout-form";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: { coupon?: string } }) {
  const user = await requireUser();
  const [cart, settings, addresses] = await Promise.all([
    getCartLines(user.id), getSettings(), db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
  ]);
  if (cart.lines.some((l) => l.unavailable)) redirect("/cart");
  if (cart.lines.length === 0) {
    return <div className="container max-w-xl py-24"><EmptyState title="Nothing to check out" action={<Button asChild><Link href="/shop">Browse products</Link></Button>} /></div>;
  }
  return (
    <div className="container py-10">
      <h1 className="text-4xl">Checkout</h1>
      <CheckoutForm
        email={user.email}
        name={user.name ?? ""}
        lines={cart.lines}
        subtotalCents={cart.subtotalCents}
        addresses={addresses.map(({ id, label, fullName, phone, line1, line2, city, state, postalCode, country }) => ({ id, label, fullName, phone, line1, line2: line2 ?? "", city, state: state ?? "", postalCode, country }))}
        config={{ flat: settings.shippingFlatCents, express: settings.expressShippingCents, freeOver: settings.freeShippingOverCents, taxBps: settings.taxRateBps }}
        stripeEnabled={stripeConfigured()}
        initialCoupon={searchParams.coupon ?? ""}
      />
    </div>
  );
}
