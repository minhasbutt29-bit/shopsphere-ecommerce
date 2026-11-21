import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { consumeToken } from "@/lib/tokens";

export const POST = api(async (req: Request) => {
  const { token } = z.object({ token: z.string().min(32).max(128) }).parse(await req.json());
  const email = await consumeToken("verify", token);
  if (!email) throw new HttpError(400, "This verification link is invalid or has expired");
  await db.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } });
  return NextResponse.json({ ok: true });
});
