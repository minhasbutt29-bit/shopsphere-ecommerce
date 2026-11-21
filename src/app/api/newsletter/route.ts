import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { newsletterSchema } from "@/validation/schemas";

export const POST = api(async (req: Request) => {
  const rl = await rateLimit(`newsletter:${clientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many requests");
  const { email } = newsletterSchema.parse(await req.json());
  await db.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: { isActive: true } });
  return NextResponse.json({ ok: true });
});
