import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";
import { profileSchema } from "@/validation/schemas";

const SAFE = { id: true, name: true, email: true, phone: true, newsletter: true, emailVerified: true, createdAt: true } as const;

export const GET = api(async () => {
  const user = await requireUserApi();
  return NextResponse.json({ profile: await db.user.findUniqueOrThrow({ where: { id: user.id }, select: SAFE }) });
});

/** Only whitelisted fields are updated; `role`, `email`, `isActive` can never be changed here. */
export const PATCH = api(async (req: Request) => {
  const user = await requireUserApi();
  const d = profileSchema.parse(await req.json());
  const profile = await db.user.update({ where: { id: user.id }, data: { name: d.name, phone: d.phone || null, newsletter: d.newsletter }, select: SAFE });
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true } });
  if (d.newsletter) await db.newsletterSubscriber.upsert({ where: { email: me.email }, create: { email: me.email }, update: { isActive: true } });
  else await db.newsletterSubscriber.updateMany({ where: { email: me.email }, data: { isActive: false } });
  return NextResponse.json({ profile });
});
