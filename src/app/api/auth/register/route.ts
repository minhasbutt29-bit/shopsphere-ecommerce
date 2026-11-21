import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/validation/schemas";
import { createToken } from "@/lib/tokens";
import { emails } from "@/lib/email";

export const POST = api(async (req: Request) => {
  const rl = await rateLimit(`register:${clientIp(req)}`, 5, 60 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many attempts. Try again later.");

  // registerSchema has no `role` key, and zod strips unknown keys, so a client can never set a role.
  const data = registerSchema.parse(await req.json());
  const existing = await db.user.findUnique({ where: { email: data.email } });

  // Same response whether or not the email exists (prevents account enumeration).
  if (!existing) {
    const user = await db.user.create({
      data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: "CUSTOMER", newsletter: data.newsletter },
    });
    if (data.newsletter) await db.newsletterSubscriber.upsert({ where: { email: data.email }, create: { email: data.email }, update: { isActive: true } });
    const token = await createToken("verify", user.email, 60 * 24);
    await emails.verify(user.email, token);
  }
  return NextResponse.json({ ok: true, message: "If the email is valid, a verification link has been sent." }, { status: 201 });
});
