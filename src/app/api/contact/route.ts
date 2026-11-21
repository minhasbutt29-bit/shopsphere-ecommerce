import { NextResponse } from "next/server";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { contactSchema } from "@/validation/schemas";
import { emails } from "@/lib/email";
import { getSettings } from "@/services/settings";

export const POST = api(async (req: Request) => {
  const rl = await rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60);
  if (!rl.ok) throw new HttpError(429, "Too many messages");
  const data = contactSchema.parse(await req.json());
  const settings = await getSettings();
  await emails.contact(settings.contactEmail, data);
  return NextResponse.json({ ok: true });
});
