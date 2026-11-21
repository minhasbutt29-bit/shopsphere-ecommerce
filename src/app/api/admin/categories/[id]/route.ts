import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { categorySchema } from "@/validation/schemas";
import { slugify } from "@/lib/utils";
import { uploadImage } from "@/lib/cloudinary";

type Ctx = { params: { id: string } };

export const PUT = api(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  const form = await req.formData();
  const d = categorySchema.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (d.parentId === params.id) throw new HttpError(400, "A category cannot be its own parent");
  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? (await uploadImage(file, "shopsphere/categories")).url : undefined;
  const category = await db.category.update({ where: { id: params.id }, data: { name: d.name, slug: slugify(d.name), description: d.description || null, parentId: d.parentId || null, sortOrder: d.sortOrder, ...(image ? { image } : {}) } });
  await logAdminActivity({ actorId: admin.id, action: "category.update", entity: "Category", entityId: params.id });
  return NextResponse.json({ category });
});

export const DELETE = api(async (_r: Request, { params }: Ctx) => {
  const admin = await requireAdminApi();
  await db.category.delete({ where: { id: params.id } }); // products → categoryId SetNull
  await logAdminActivity({ actorId: admin.id, action: "category.delete", entity: "Category", entityId: params.id });
  return NextResponse.json({ ok: true });
});
