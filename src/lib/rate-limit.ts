import { db } from "./db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Fixed-window rate limiter backed by Postgres so it works across serverless instances.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  const row = await db.rateLimit.findUnique({ where: { key } });

  if (!row || row.resetAt < now) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (row.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000) };
  }
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: true, remaining: limit - row.count - 1, retryAfterSec: 0 };
}
