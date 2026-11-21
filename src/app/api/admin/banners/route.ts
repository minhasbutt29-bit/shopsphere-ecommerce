import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { bannerSchema } from "@/validation/schemas";

export const GET = api(async () => {
  await requireAdminApi();
  return NextResponse.json({ banners: await db.banner.findMany({ orderBy: { position: "asc" } }) });
});

export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const d = bannerSchema.parse(await req.json());
  const banner = await db.banner.create({ data: { ...d, subtitle: d.subtitle || null, ctaLabel: d.ctaLabel || null, ctaHref: d.ctaHref || null } });
  await logAdminActivity({ actorId: admin.id, action: "banner.create", entity: "Banner", entityId: banner.id });
  return NextResponse.json({ banner }, { status: 201 });
});

export const DELETE = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const { id } = z.object({ id: z.string().min(1) }).parse(await req.json());
  await db.banner.delete({ where: { id } });
  await logAdminActivity({ actorId: admin.id, action: "banner.delete", entity: "Banner", entityId: id });
  return NextResponse.json({ ok: true });
});
