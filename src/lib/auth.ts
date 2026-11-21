import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/validation/schemas";
import { rateLimit } from "./rate-limit";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

// Constant-time-ish dummy hash so unknown emails cost the same as known ones.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5Yq2G3V5uQy3gG9rY3jZy3x9Qx1lq0y";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const rl = await rateLimit(`login:${email}`, 10, 15 * 60);
        if (!rl.ok) throw new TooManyAttempts();

        const user = await db.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.passwordHash || !user.isActive) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) throw new TooManyAttempts();

        if (!valid) {
          const failed = user.failedLogins + 1;
          await db.user.update({
            where: { id: user.id },
            data: failed >= MAX_FAILED_LOGINS
              ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
              : { failedLogins: failed },
          });
          return null;
        }
        if (!user.emailVerified) throw new EmailNotVerified();

        if (user.failedLogins > 0 || user.lockedUntil) {
          await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
