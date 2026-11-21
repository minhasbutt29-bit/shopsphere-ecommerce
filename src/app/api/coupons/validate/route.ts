import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireUserApi } from "@/lib/authz";
import { getCartLines } from "@/services/cart";
import { evaluateCoupon } from "@/services/pricing";

export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  const rl = await rateLimit(`coupon:${user.id}:${clientIp(req)}`, 20, 10 * 60); // stops code guessing
  if (!rl.ok) throw new HttpError(429, "Too many attempts");
  const { code } = z.object({ code: z.string().trim().toUpperCase().min(1).max(40) }).parse(await req.json());
  const { subtotalCents } = await getCartLines(user.id);
  const coupon = await db.coupon.findUnique({ where: { code } });
  const result = evaluateCoupon(coupon, subtotalCents);
  if (!result.ok) throw new HttpError(400, result.reason);
  return NextResponse.json({ code, discountCents: result.discountCents });
});
