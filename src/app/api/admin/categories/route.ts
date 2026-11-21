import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { logAdminActivity } from "@/lib/audit";
import { categorySchema } from "@/validation/schemas";
import { slugify } from "@/lib/utils";
import { uploadImage } from "@/lib/cloudinary";

export const GET = api(async () => {
  await requireAdminApi();
  return NextResponse.json({ categories: await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }) });
});

/** Accepts multipart/form-data so a category image can be uploaded in the same request. */
export const POST = api(async (req: Request) => {
  const admin = await requireAdminApi();
  const form = await req.formData();
  const d = categorySchema.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? (await uploadImage(file, "shopsphere/categories")).url : null;
  try {
    const category = await db.category.create({ data: { name: d.name, slug: slugify(d.name), description: d.description || null, parentId: d.parentId || null, sortOrder: d.sortOrder, image } });
    await logAdminActivity({ actorId: admin.id, action: "category.create", entity: "Category", entityId: category.id });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "A category with this name already exists");
    throw e;
  }
});
