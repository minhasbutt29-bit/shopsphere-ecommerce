import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { resetSchema } from "@/validation/schemas";
import { consumeToken } from "@/lib/tokens";

export const POST = api(async (req: Request) => {
  const rl = await rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many attempts. Try again later.");
  const { token, password } = resetSchema.parse(await req.json());
  const email = await consumeToken("reset", token);
  if (!email) throw new HttpError(400, "This reset link is invalid or has expired");
  await db.user.update({
    where: { email },
    // A successful reset also proves mailbox ownership and clears any lockout.
    data: { passwordHash: await bcrypt.hash(password, 12), emailVerified: new Date(), failedLogins: 0, lockedUntil: null },
  });
  return NextResponse.json({ ok: true });
});
