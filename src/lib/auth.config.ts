import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

// Edge-safe auth config for middleware (no bcrypt, no Prisma)
export const authConfig: NextAuthConfig = {
  // Render (and other proxies) often terminate TLS and forward host headers.
  // Auth.js requires explicitly trusting the host in production environments.
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV === "development",
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 28800, // 8 hours
  },
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole) ?? "VIEW_ONLY";
        session.user.avatar = (token.avatar as string) ?? null;
      }
      return session;
    },
  },
};
