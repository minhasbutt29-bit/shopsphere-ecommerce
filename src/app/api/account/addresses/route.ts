import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { requireUserApi } from "@/lib/authz";
import { addressSchema } from "@/validation/schemas";

export const GET = api(async () => {
  const user = await requireUserApi();
  return NextResponse.json({ addresses: await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) });
});

export const POST = api(async (req: Request) => {
  const user = await requireUserApi();
  const d = addressSchema.parse(await req.json());
  if ((await db.address.count({ where: { userId: user.id } })) >= 10) throw new HttpError(400, "Maximum 10 addresses");
  const address = await db.$transaction(async (tx) => {
    const first = (await tx.address.count({ where: { userId: user.id } })) === 0;
    if (d.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.create({ data: { ...d, userId: user.id, isDefault: d.isDefault || first } });
  });
  return NextResponse.json({ address }, { status: 201 });
});

export const DELETE = api(async (req: Request) => {
  const user = await requireUserApi();
  const { id } = z.object({ id: z.string().min(1) }).parse(await req.json());
  const res = await db.address.deleteMany({ where: { id, userId: user.id } }); // ownership in the WHERE clause
  if (res.count !== 1) throw new HttpError(404, "Address not found");
  return NextResponse.json({ ok: true });
});
