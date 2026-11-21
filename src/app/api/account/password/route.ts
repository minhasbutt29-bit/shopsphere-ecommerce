import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireUserApi } from "@/lib/authz";
import { changePasswordSchema } from "@/validation/schemas";

export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  const rl = await rateLimit(`chgpw:${user.id}`, 5, 15 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many attempts");
  const { currentPassword, newPassword } = changePasswordSchema.parse(await req.json());
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row.passwordHash || !(await bcrypt.compare(currentPassword, row.passwordHash))) throw new HttpError(400, "Current password is incorrect");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  return NextResponse.json({ ok: true });
});
