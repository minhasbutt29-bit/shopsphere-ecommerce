import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { forgotSchema } from "@/validation/schemas";
import { createToken } from "@/lib/tokens";
import { emails } from "@/lib/email";

export const POST = api(async (req: Request) => {
  const rl = await rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many requests. Try again later.");
  const { email } = forgotSchema.parse(await req.json());
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const token = await createToken("reset", email, 60);
    await emails.reset(email, token);
  }
  // Identical response regardless of whether the account exists.
  return NextResponse.json({ ok: true, message: "If an account exists, a reset link has been sent." });
});
