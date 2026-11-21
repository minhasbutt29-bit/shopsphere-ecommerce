import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { registerSchema } from "@/validation/schemas";

/** The ONLY runtime path that creates another administrator: an existing admin, verified server-side. */
export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const d = registerSchema.parse(await req.json());
  if (await db.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, "Email already in use");
  const user = await db.user.create({ data: { name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12), role: "ADMIN", emailVerified: new Date() }, select: { id: true, email: true } });
  await logAdminActivity({ actorId: admin.id, action: "admin.create", entity: "User", entityId: user.id });
  return NextResponse.json({ user }, { status: 201 });
});
