import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config (no DB / bcrypt imports) shared with middleware.
 * Middleware is only a first, coarse gate. Every admin page, route handler and
 * server action re-checks the role against the database (see lib/authz.ts).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;
      if (pathname.startsWith("/admin")) return !!user && user.role === "ADMIN";
      if (pathname.startsWith("/account") || pathname.startsWith("/checkout")) return !!user;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: "CUSTOMER" | "ADMIN" }).role ?? "CUSTOMER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "CUSTOMER" | "ADMIN") ?? "CUSTOMER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
