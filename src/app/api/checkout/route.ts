import { NextResponse } from "next/server";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireUserApi } from "@/lib/authz";
import { checkoutSchema } from "@/validation/schemas";
import { createOrderFromCart } from "@/services/checkout";
import { createStripeCheckoutSession } from "@/services/payments";
import { stripeConfigured } from "@/lib/stripe";
import { cancelOrder } from "@/services/orders";

export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  const rl = await rateLimit(`checkout:${user.id}:${clientIp(req)}`, 15, 10 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many checkout attempts");
  const input = checkoutSchema.parse(await req.json());

  if (input.paymentMethod === "STRIPE" && !stripeConfigured()) {
    throw new HttpError(503, "Card payments are not configured on this store. Choose Cash on Delivery.");
  }

  const order = await createOrderFromCart(user.id, input);

  if (input.paymentMethod === "STRIPE" && order.status === "PENDING" && order.payment?.status === "PENDING") {
    try {
      const url = await createStripeCheckoutSession(order.id, user.id);
      return NextResponse.json({ orderNumber: order.number, redirectUrl: url }, { status: 201 });
    } catch (e) {
      // Could not start payment: release stock and coupon instead of leaving a dangling order.
      await cancelOrder(order.id, { reason: "Payment session could not be created", paymentFailed: true }).catch(() => undefined);
      throw e;
    }
  }
  return NextResponse.json({ orderNumber: order.number, redirectUrl: `/checkout/success?order=${order.number}` }, { status: 201 });
});
