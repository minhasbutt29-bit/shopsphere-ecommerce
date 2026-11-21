import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export type TokenPurpose = "verify" | "reset";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const ident = (purpose: TokenPurpose, email: string) => `${purpose}:${email.toLowerCase()}`;

/** Returns the raw token (sent by email). Only the SHA-256 hash is stored. */
export async function createToken(purpose: TokenPurpose, email: string, ttlMinutes: number): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await db.verificationToken.deleteMany({ where: { identifier: ident(purpose, email) } });
  await db.verificationToken.create({
    data: { identifier: ident(purpose, email), token: hash(raw), expires: new Date(Date.now() + ttlMinutes * 60_000) },
  });
  return raw;
}

/** Validates and consumes a token (single use). Returns the email or null. */
export async function consumeToken(purpose: TokenPurpose, raw: string): Promise<string | null> {
  const row = await db.verificationToken.findUnique({ where: { token: hash(raw) } });
  if (!row || !row.identifier.startsWith(`${purpose}:`)) return null;
  await db.verificationToken.delete({ where: { token: row.token } }).catch(() => undefined);
  if (row.expires < new Date()) return null;
  return row.identifier.slice(purpose.length + 1);
}
