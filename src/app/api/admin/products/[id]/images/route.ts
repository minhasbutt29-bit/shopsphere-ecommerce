import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireAdminApi } from "@/lib/authz";
import { uploadImage, deleteImage } from "@/lib/cloudinary";

type Ctx = { params: { id: string } };

export const POST = api(async (req: Request, { params }: Ctx) => {
  await requireAdminApi();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file provided");
  const product = await db.product.findUnique({ where: { id: params.id }, select: { id: true, name: true, _count: { select: { images: true } } } });
  if (!product) throw new HttpError(404, "Product not found");
  if (product._count.images >= 8) throw new HttpError(400, "A product can have at most 8 images");
  const { url, publicId } = await uploadImage(file);
  const image = await db.productImage.create({ data: { productId: product.id, url, publicId, alt: product.name, position: product._count.images } });
  return NextResponse.json({ image }, { status: 201 });
});

export const DELETE = api(async (req: Request, { params }: Ctx) => {
  await requireAdminApi();
  const { imageId } = z.object({ imageId: z.string().min(1) }).parse(await req.json());
  const img = await db.productImage.findFirst({ where: { id: imageId, productId: params.id } });
  if (!img) throw new HttpError(404, "Image not found");
  await db.productImage.delete({ where: { id: img.id } });
  if (img.publicId) await deleteImage(img.publicId);
  return NextResponse.json({ ok: true });
});
