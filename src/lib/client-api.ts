"use client";
import { toast } from "sonner";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

/** Typed fetch helper for client components. Throws ApiError with the server's message. */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong", data.details);
  return data as T;
}

/** Runs an API call, shows a toast on failure, returns undefined when it fails. */
export async function attempt<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const out = await fn();
    if (success) toast.success(success);
    return out;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Something went wrong");
    return undefined;
  }
}
