import type Stripe from "stripe";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";
import { emails } from "@/lib/email";
import { cancelOrder } from "./orders";

export async function createStripeCheckoutSession(orderId: string, userId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId }, include: { payment: true } });
  if (!order || !order.payment) throw new HttpError(404, "Order not found");
  if (order.payment.method !== "STRIPE") throw new HttpError(400, "This order is not a card payment");
  if (order.payment.status !== "PENDING" || order.status !== "PENDING") throw new HttpError(409, "This order is not awaiting payment");

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.email,
      metadata: { orderId: order.id, orderNumber: order.number },
      payment_intent_data: { metadata: { orderId: order.id } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency,
            unit_amount: order.totalCents, // server-computed total incl. shipping, tax and discounts
            product_data: { name: `ShopSphere order ${order.number}` },
          },
        },
      ],
      success_url: appUrl(`/checkout/success?order=${order.number}`),
      cancel_url: appUrl(`/checkout/cancel?order=${order.number}`),
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `session_${order.id}` },
  );
  await db.payment.update({ where: { id: order.payment.id }, data: { stripeSessionId: session.id } });
  return session.url as string;
}

/** Idempotent: only the first delivery flips PENDING → PAID. */
async function markPaid(sessionId: string, paymentIntentId: string | null) {
  const flipped = await db.payment.updateMany({
    where: { stripeSessionId: sessionId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: paymentIntentId },
  });
  if (flipped.count !== 1) return; // duplicate webhook delivery
  const payment = await db.payment.findUnique({ where: { stripeSessionId: sessionId }, include: { order: true } });
  if (!payment) return;
  const moved = await db.order.updateMany({ where: { id: payment.orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
  if (moved.count === 1) void emails.orderConfirmation(payment.order.email, payment.order).catch(() => undefined);
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid") {
        await markPaid(s.id, typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null);
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const payment = await db.payment.findUnique({ where: { stripeSessionId: s.id } });
      if (payment && payment.status === "PENDING") {
        await cancelOrder(payment.orderId, { reason: "Payment not completed", paymentFailed: true }).catch((e) => {
          if (!(e instanceof HttpError)) throw e; // already cancelled → ignore
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await db.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { failureReason: pi.last_payment_error?.message ?? "Card payment failed" } });
      }
      break;
    }
    default:
      break;
  }
}
