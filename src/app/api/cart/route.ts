import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";
import { addToCart, getCartLines, updateCartItem } from "@/services/cart";
import { cartAddSchema, cartUpdateSchema } from "@/validation/schemas";

export const GET = api(async () => {
  const user = await requireUserApi();
  return NextResponse.json(await getCartLines(user.id));
});

export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  await addToCart(user.id, cartAddSchema.parse(await req.json()));
  return NextResponse.json(await getCartLines(user.id), { status: 201 });
});

export const PATCH = api(async (req: Request) => {
  const user = await requireUserApi();
  const { itemId, quantity } = cartUpdateSchema.parse(await req.json());
  await updateCartItem(user.id, itemId, quantity);
  return NextResponse.json(await getCartLines(user.id));
});
