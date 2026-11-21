import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { emails } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { logAdminActivity } from "@/lib/audit";
import { applyStockChange } from "./inventory";
import { canTransition, customerCanCancel } from "./pricing";

const CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

/**
 * Cancels an order and returns stock + coupon redemption. The guarded `updateMany`
 * (status must still be cancellable) makes the operation safe against double execution.
 */
export async function cancelOrder(orderId: string, opts: { actorId?: string; reason?: string; paymentFailed?: boolean } = {}) {
  const order = await db.$transaction(async (tx) => {
    const flipped = await tx.order.updateMany({
      where: { id: orderId, status: { in: CANCELLABLE } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (flipped.count !== 1) throw new HttpError(409, "Order can no longer be cancelled");

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payment: true, couponUse: true } });
    for (const item of order.items) {
      if (!item.productId) continue;
      await applyStockChange(tx, {
        productId: item.productId,
        variantId: item.variantId,
        change: item.quantity,
        type: "CANCELLATION",
        orderId,
        note: opts.reason ?? `Cancelled ${order.number}`,
        actorId: opts.actorId,
      });
      await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: item.quantity } } });
    }
    if (order.couponUse) {
      await tx.coupon.update({ where: { id: order.couponUse.couponId }, data: { usedCount: { decrement: 1 } } });
      await tx.couponUsage.delete({ where: { id: order.couponUse.id } });
    }
    if (order.payment && order.payment.status === "PENDING") {
      await tx.payment.update({ where: { id: order.payment.id }, data: { status: "FAILED", failureReason: opts.paymentFailed ? "Payment not completed" : "Order cancelled" } });
    }
    return order;
  });
  void emails.orderStatus(order.email, order.number, "CANCELLED").catch(() => undefined);
  return order;
}

/** Customers can only cancel their OWN orders, and only before fulfilment. */
export async function cancelOwnOrder(userId: string, orderId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId }, select: { id: true, status: true, payment: true } });
  if (!order) throw new HttpError(404, "Order not found");
  if (!customerCanCancel(order.status)) throw new HttpError(409, "This order can no longer be cancelled. Please contact support.");
  if (order.payment?.status === "PAID") throw new HttpError(409, "Paid orders must be refunded by support. Please contact us.");
  return cancelOrder(order.id, { actorId: userId, reason: "Cancelled by customer" });
}

/**
 * Refund: Stripe first (idempotent via key so retries are safe), then a guarded DB transaction.
 */
export async function refundOrder(orderId: string, actorId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true, items: true } });
  if (!order || !order.payment) throw new HttpError(404, "Order not found");
  if (order.payment.status !== "PAID") throw new HttpError(409, "Only paid orders can be refunded");
  if (!canTransition(order.status, "REFUNDED")) throw new HttpError(409, `Cannot refund an order that is ${order.status.toLowerCase()}`);

  if (order.payment.method === "STRIPE") {
    if (!order.payment.stripePaymentIntentId) throw new HttpError(409, "Missing Stripe payment reference");
    await getStripe().refunds.create({ payment_intent: order.payment.stripePaymentIntentId }, { idempotencyKey: `refund_${order.id}` });
  }

  await db.$transaction(async (tx) => {
    const flipped = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: "REFUNDED" } });
    if (flipped.count !== 1) throw new HttpError(409, "Order changed while refunding");
    await tx.payment.update({ where: { id: order.payment!.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
    for (const item of order.items) {
      if (!item.productId) continue;
      await applyStockChange(tx, { productId: item.productId, variantId: item.variantId, change: item.quantity, type: "REFUND", orderId, actorId, note: `Refund ${order.number}` });
    }
  });
  await logAdminActivity({ actorId, action: "order.refund", entity: "Order", entityId: orderId, meta: { number: order.number, amountCents: order.totalCents } });
  void emails.orderStatus(order.email, order.number, "REFUNDED").catch(() => undefined);
}

export async function updateOrderStatus(
  orderId: string,
  input: { status: OrderStatus; trackingNumber?: string; carrier?: string },
  actorId: string,
) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) throw new HttpError(404, "Order not found");
  if (order.status === input.status) return order;
  if (!canTransition(order.status, input.status)) {
    throw new HttpError(409, `Cannot change status from ${order.status} to ${input.status}`);
  }

  if (input.status === "CANCELLED") {
    if (order.payment?.status === "PAID") throw new HttpError(409, "This order is paid. Use Refund instead of Cancel.");
    await cancelOrder(orderId, { actorId, reason: "Cancelled by admin" });
  } else if (input.status === "REFUNDED") {
    await refundOrder(orderId, actorId);
  } else {
    await db.$transaction(async (tx) => {
      const flipped = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status: input.status,
          ...(input.status === "SHIPPED" ? { shippedAt: new Date(), trackingNumber: input.trackingNumber, carrier: input.carrier } : {}),
          ...(input.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        },
      });
      if (flipped.count !== 1) throw new HttpError(409, "Order changed, please reload");
      // Cash on delivery is considered paid on delivery.
      if (input.status === "DELIVERED" && order.payment?.method === "COD" && order.payment.status === "PENDING") {
        await tx.payment.update({ where: { id: order.payment.id }, data: { status: "PAID", paidAt: new Date() } });
      }
    });
    void emails.orderStatus(order.email, order.number, input.status).catch(() => undefined);
  }

  await logAdminActivity({ actorId, action: "order.status", entity: "Order", entityId: orderId, meta: { from: order.status, to: input.status } });
  return db.order.findUniqueOrThrow({ where: { id: orderId } });
}
