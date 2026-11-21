import { db } from "./db";
import type { Prisma } from "@prisma/client";

export async function logAdminActivity(params: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
  ip?: string;
}) {
  await db.adminActivityLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      meta: params.meta,
      ip: params.ip,
    },
  });
}
