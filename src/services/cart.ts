import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { effectivePrice } from "@/lib/money";

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
      variant: true,
    },
  },
};

export async function getOrCreateCart(userId: string) {
  return db.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: cartInclude });
}

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  image: string | null;
  variantLabel: string | null;
  unitCents: number;
  quantity: number;
  available: number;
  lineCents: number;
  unavailable: boolean;
};

export async function getCartLines(userId: string): Promise<{ lines: CartLine[]; subtotalCents: number; count: number }> {
  const cart = await getOrCreateCart(userId);
  const lines: CartLine[] = cart.items.map((i) => {
    const unit = i.variant?.priceCents ?? effectivePrice(i.product);
    const available = i.variant ? i.variant.stock : i.product.stock;
    const unavailable = !i.product.isPublished || available < 1;
    return {
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      slug: i.product.slug,
      name: i.product.name,
      image: i.product.images[0]?.url ?? null,
      variantLabel: i.variant ? [i.variant.size, i.variant.color].filter(Boolean).join(" / ") : null,
      unitCents: unit,
      quantity: i.quantity,
      available,
      lineCents: unit * i.quantity,
      unavailable,
    };
  });
  return {
    lines,
    subtotalCents: lines.filter((l) => !l.unavailable).reduce((s, l) => s + l.lineCents, 0),
    count: lines.reduce((s, l) => s + l.quantity, 0),
  };
}

export async function addToCart(userId: string, input: { productId: string; variantId?: string | null; quantity: number }) {
  const product = await db.product.findFirst({ where: { id: input.productId, isPublished: true }, include: { variants: true } });
  if (!product) throw new HttpError(404, "Product not found");
  let available = product.stock;
  if (product.variants.length > 0) {
    if (!input.variantId) throw new HttpError(400, "Please select a variant");
    const v = product.variants.find((x) => x.id === input.variantId);
    if (!v) throw new HttpError(400, "Invalid variant");
    available = v.stock;
  } else if (input.variantId) {
    throw new HttpError(400, "Invalid variant");
  }

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((i) => i.productId === input.productId && (i.variantId ?? null) === (input.variantId ?? null));
  const nextQty = (existing?.quantity ?? 0) + input.quantity;
  if (nextQty > available) throw new HttpError(409, `Only ${available} left in stock`);

  if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  else await db.cartItem.create({ data: { cartId: cart.id, productId: input.productId, variantId: input.variantId ?? null, quantity: input.quantity } });
  await db.cart.update({ where: { id: cart.id }, data: { reminderSentAt: null } });
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  // Ownership enforced through the relation filter: only items in THIS user's cart match.
  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { userId } }, include: { product: true, variant: true } });
  if (!item) throw new HttpError(404, "Cart item not found");
  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const available = item.variant ? item.variant.stock : item.product.stock;
  if (quantity > available) throw new HttpError(409, `Only ${available} left in stock`);
  await db.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

/** Abandoned-cart tracking: carts with items untouched for `hours` that have not been reminded. */
export async function findAbandonedCarts(hours = 24) {
  return db.cart.findMany({
    where: { updatedAt: { lt: new Date(Date.now() - hours * 3_600_000) }, reminderSentAt: null, items: { some: {} } },
    include: { user: { select: { email: true, name: true } }, items: true },
    take: 200,
  });
}
