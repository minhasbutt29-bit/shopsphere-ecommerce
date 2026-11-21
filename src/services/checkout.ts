import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { effectivePrice } from "@/lib/money";
import { orderNumber } from "@/lib/utils";
import { emails } from "@/lib/email";
import type { CheckoutInput } from "@/validation/schemas";
import { evaluateCoupon, computeTotals } from "./pricing";
import { applyStockChange, notifyLowStock } from "./inventory";
import { getSettings } from "./settings";

/**
 * Creates an order from the user's server-side cart in ONE transaction:
 *  - re-prices every line from the database (client prices are never trusted)
 *  - validates and atomically redeems the coupon
 *  - decrements stock with conditional updates (no overselling)
 *  - is idempotent on `idempotencyKey` (double-submit safe)
 */
export async function createOrderFromCart(userId: string, input: CheckoutInput) {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { payment: true } });
  if (existing) {
    if (existing.userId !== userId) throw new HttpError(409, "Duplicate request");
    return existing;
  }

  const settings = await getSettings();
  const shipping = input.shippingAddress;
  const billing = input.billingSameAsShipping || !input.billingAddress ? shipping : input.billingAddress;

  try {
    const order = await db.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } }, variant: true } } },
      });
      if (!cart || cart.items.length === 0) throw new HttpError(400, "Your cart is empty");

      const lines = cart.items.map((i) => {
        if (!i.product.isPublished) throw new HttpError(409, `${i.product.name} is no longer available`);
        const unitCents = i.variant?.priceCents ?? effectivePrice(i.product);
        return { item: i, unitCents, totalCents: unitCents * i.quantity };
      });
      const subtotalCents = lines.reduce((s, l) => s + l.totalCents, 0);

      // Coupon: validate, enforce per-user limit, redeem atomically.
      let discountCents = 0;
      let couponId: string | null = null;
      let couponCode: string | null = null;
      if (input.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: input.couponCode } });
        const result = evaluateCoupon(coupon, subtotalCents);
        if (!result.ok || !coupon) throw new HttpError(400, result.ok ? "Invalid coupon code" : result.reason);
        if (coupon.perUserLimit != null) {
          const used = await tx.couponUsage.count({ where: { couponId: coupon.id, userId } });
          if (used >= coupon.perUserLimit) throw new HttpError(400, "You have already used this coupon");
        }
        const redeemed = await tx.coupon.updateMany({
          where: { id: coupon.id, isActive: true, ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (redeemed.count !== 1) throw new HttpError(400, "This coupon has reached its usage limit");
        discountCents = result.discountCents;
        couponId = coupon.id;
        couponCode = coupon.code;
      }

      const totals = computeTotals(subtotalCents, discountCents, input.shippingMethod, settings);
      const isCod = input.paymentMethod === "COD";

      const created = await tx.order.create({
        data: {
          number: orderNumber(),
          idempotencyKey: input.idempotencyKey,
          userId,
          email: input.email,
          status: isCod ? "CONFIRMED" : "PENDING",
          ...totals,
          currency: settings.currency,
          couponCode,
          shippingMethod: input.shippingMethod,
          shippingAddress: shipping as unknown as Prisma.InputJsonValue,
          billingAddress: billing as unknown as Prisma.InputJsonValue,
          notes: input.notes,
          items: {
            create: lines.map((l) => ({
              productId: l.item.productId,
              variantId: l.item.variantId,
              name: l.item.product.name,
              sku: l.item.variant?.sku ?? l.item.product.sku,
              variantLabel: l.item.variant ? [l.item.variant.size, l.item.variant.color].filter(Boolean).join(" / ") || null : null,
              image: l.item.product.images[0]?.url ?? null,
              unitCents: l.unitCents,
              quantity: l.item.quantity,
              totalCents: l.totalCents,
            })),
          },
          payment: { create: { method: input.paymentMethod, status: "PENDING", amountCents: totals.totalCents, currency: settings.currency } },
        },
        include: { payment: true, items: true },
      });

      for (const l of lines) {
        await applyStockChange(tx, {
          productId: l.item.productId,
          variantId: l.item.variantId,
          change: -l.item.quantity,
          type: "PURCHASE",
          orderId: created.id,
          note: `Order ${created.number}`,
        });
        await tx.product.update({ where: { id: l.item.productId }, data: { soldCount: { increment: l.item.quantity } } });
      }

      if (couponId) await tx.couponUsage.create({ data: { couponId, userId, orderId: created.id } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    void notifyLowStock(order.items.map((i) => i.productId).filter((x): x is string => !!x));
    if (order.status === "CONFIRMED") void emails.orderConfirmation(order.email, order).catch(() => undefined);
    return order;
  } catch (e) {
    // Concurrent double-submit with the same idempotency key.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { payment: true } });
      if (again && again.userId === userId) return again;
    }
    throw e;
  }
}
