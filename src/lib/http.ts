import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const unauthorized = () => new HttpError(401, "Authentication required");
export const forbidden = () => new HttpError(403, "Forbidden");
export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);

/** Wraps a route handler: converts thrown errors into JSON responses with correct status codes. */
export function api<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response | NextResponse>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 400 });
      }
      console.error("[api] unhandled error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
