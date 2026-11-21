import { db } from "@/lib/db";

export async function getSettings() {
  return db.storeSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
}
