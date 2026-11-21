"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ProductImage } from "@/components/ui/misc";
import { apiFetch, attempt } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";
import { addressSchema } from "@/validation/schemas";
import type { CartLine } from "@/services/cart";

// Client-side schema mirrors the server's; the server re-validates everything.
const formSchema = z.object({
  email: z.string().email(),
  shipping: addressSchema.omit({ isDefault: true, label: true }),
  billingSame: z.boolean(),
  billing: addressSchema.omit({ isDefault: true, label: true }).partial().optional(),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["STRIPE", "COD"]),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof formSchema>;
type Addr = { id: string; label: string | null; fullName: string; phone: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: string };

export function CheckoutForm({ email, name, lines, subtotalCents, addresses, config, stripeEnabled, initialCoupon }: {
  email: string; name: string; lines: CartLine[]; subtotalCents: number; addresses: Addr[];
  config: { flat: number; express: number; freeOver: number; taxBps: number }; stripeEnabled: boolean; initialCoupon: string;
}) {
  const router = useRouter();
  const idempotencyKey = React.useRef(crypto.randomUUID().replace(/-/g, ""));
  const first = addresses[0];
  const [coupon, setCoupon] = React.useState(initialCoupon);
  const [discount, setDiscount] = React.useState(0);
  const [applied, setApplied] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email, billingSame: true, shippingMethod: "standard", paymentMethod: stripeEnabled ? "STRIPE" : "COD",
      shipping: { fullName: first?.fullName ?? name, phone: first?.phone ?? "", line1: first?.line1 ?? "", line2: first?.line2 ?? "", city: first?.city ?? "", state: first?.state ?? "", postalCode: first?.postalCode ?? "", country: first?.country ?? "" },
    },
  });
  const method = watch("shippingMethod");
  const payment = watch("paymentMethod");
  const billingSame = watch("billingSame");

  const taxable = Math.max(0, subtotalCents - discount);
  const shipping = method === "express" ? config.express : config.freeOver > 0 && taxable >= config.freeOver ? 0 : config.flat;
  const tax = Math.round((taxable * config.taxBps) / 10_000);
  const total = taxable + shipping + tax;

  const applyCoupon = React.useCallback(async (c: string) => {
    const r = await attempt(() => apiFetch<{ code: string; discountCents: number }>("/api/coupons/validate", { method: "POST", json: { code: c } }), "Coupon applied");
    if (r) { setDiscount(r.discountCents); setApplied(r.code); }
  }, []);
  React.useEffect(() => { if (initialCoupon) void applyCoupon(initialCoupon); }, [initialCoupon, applyCoupon]);

  async function onSubmit(v: FormValues) {
    setSubmitting(true);
    const res = await attempt(() =>
      apiFetch<{ redirectUrl: string }>("/api/checkout", {
        method: "POST",
        json: {
          email: v.email, shippingAddress: v.shipping, billingSameAsShipping: v.billingSame,
          billingAddress: v.billingSame ? undefined : v.billing, shippingMethod: v.shippingMethod, paymentMethod: v.paymentMethod,
          couponCode: applied || undefined, idempotencyKey: idempotencyKey.current, notes: v.notes || undefined,
        },
      }),
    );
    if (res) { window.location.href = res.redirectUrl; return; }
    setSubmitting(false);
    router.refresh();
  }

  const e = errors.shipping;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-xl">Contact</h2>
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register("email")} /></Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl">Shipping address</h2>
          {addresses.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Saved addresses">
              {addresses.map((a) => (
                <Button key={a.id} type="button" variant="outline" size="sm" onClick={() => {
                  (["fullName", "phone", "line1", "line2", "city", "state", "postalCode", "country"] as const).forEach((k) => setValue(`shipping.${k}`, a[k]));
                }}>{a.label || a.line1}</Button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={e?.fullName?.message}><Input autoComplete="name" {...register("shipping.fullName")} /></Field>
            <Field label="Phone" error={e?.phone?.message}><Input autoComplete="tel" {...register("shipping.phone")} /></Field>
            <div className="sm:col-span-2"><Field label="Address" error={e?.line1?.message}><Input autoComplete="address-line1" {...register("shipping.line1")} /></Field></div>
            <div className="sm:col-span-2"><Field label="Apartment, suite (optional)"><Input autoComplete="address-line2" {...register("shipping.line2")} /></Field></div>
            <Field label="City" error={e?.city?.message}><Input autoComplete="address-level2" {...register("shipping.city")} /></Field>
            <Field label="State / Province"><Input autoComplete="address-level1" {...register("shipping.state")} /></Field>
            <Field label="Postal code" error={e?.postalCode?.message}><Input autoComplete="postal-code" {...register("shipping.postalCode")} /></Field>
            <Field label="Country" error={e?.country?.message}><Input autoComplete="country-name" {...register("shipping.country")} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("billingSame")} /> Billing address is the same as shipping</label>
          {!billingSame && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input {...register("billing.fullName")} /></Field>
              <Field label="Phone"><Input {...register("billing.phone")} /></Field>
              <div className="sm:col-span-2"><Field label="Address"><Input {...register("billing.line1")} /></Field></div>
              <Field label="City"><Input {...register("billing.city")} /></Field>
              <Field label="Postal code"><Input {...register("billing.postalCode")} /></Field>
              <div className="sm:col-span-2"><Field label="Country"><Input {...register("billing.country")} /></Field></div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl">Shipping method</h2>
          {([["standard", "Standard (3–5 business days)", shipping === 0 && method === "standard" ? "Free" : formatMoney(config.flat)], ["express", "Express (1–2 business days)", formatMoney(config.express)]] as const).map(([v, label, price]) => (
            <label key={v} className="flex cursor-pointer items-center justify-between rounded-md border p-4 has-[:checked]:border-foreground">
              <span className="flex items-center gap-3"><input type="radio" value={v} {...register("shippingMethod")} />{label}</span><span className="text-sm">{price}</span>
            </label>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl">Payment</h2>
          <label className={`flex items-start gap-3 rounded-md border p-4 has-[:checked]:border-foreground ${stripeEnabled ? "cursor-pointer" : "opacity-50"}`}>
            <input type="radio" value="STRIPE" disabled={!stripeEnabled} {...register("paymentMethod")} className="mt-1" />
            <span>Credit / debit card<span className="block text-xs text-muted-foreground">{stripeEnabled ? "You'll be redirected to Stripe's secure payment page." : "Card payments are not configured on this store."}</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-4 has-[:checked]:border-foreground">
            <input type="radio" value="COD" {...register("paymentMethod")} className="mt-1" />
            <span>Cash on delivery<span className="block text-xs text-muted-foreground">Pay when your order arrives.</span></span>
          </label>
        </section>

        <Field label="Order notes (optional)"><Textarea {...register("notes")} /></Field>
      </div>

      <aside className="h-fit space-y-5 rounded-lg border p-6 lg:sticky lg:top-28" aria-label="Order summary">
        <h2 className="text-xl">Order summary</h2>
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 text-sm">
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-secondary"><ProductImage src={l.image} alt={l.name} className="text-lg" /></div>
              <span className="flex-1">{l.name}{l.variantLabel ? ` (${l.variantLabel})` : ""} × {l.quantity}</span>
              <span>{formatMoney(l.lineCents)}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input value={coupon} onChange={(ev) => setCoupon(ev.target.value)} placeholder="Discount code" aria-label="Discount code" />
          <Button type="button" variant="outline" onClick={() => coupon.trim() && applyCoupon(coupon.trim())}>Apply</Button>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(subtotalCents)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount ({applied})</dt><dd>-{formatMoney(discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatMoney(shipping)}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(tax)}</dd></div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
        </dl>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>{payment === "STRIPE" ? "Continue to payment" : "Place order"}</Button>
        <p className="text-xs text-muted-foreground">The final amount is recalculated on our servers from current prices and stock.</p>
      </aside>
    </form>
  );
}
