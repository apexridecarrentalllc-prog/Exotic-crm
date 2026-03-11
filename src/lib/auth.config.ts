import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

// Edge-safe auth config for middleware (no bcrypt, no Prisma)
export const authConfig: NextAuthConfig = {
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
