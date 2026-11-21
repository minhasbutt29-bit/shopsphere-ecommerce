"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/validation/schemas";

export type LoginState = { error?: string } | undefined;

function safeCallback(url: string | null | undefined): string {
  // Only same-site relative paths: prevents open-redirect abuse.
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/account";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password" };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeCallback(formData.get("callbackUrl") as string | null) });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "email_not_verified") return { error: "Please verify your email first. Check your inbox for the link." };
      if (code === "too_many_attempts") return { error: "Too many attempts. Try again in a few minutes." };
      return { error: "Invalid email or password" };
    }
    throw e; // NEXT_REDIRECT must propagate
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
