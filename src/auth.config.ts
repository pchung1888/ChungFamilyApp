import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Prisma adapter, no Node.js-only imports.
// Used by middleware to verify sessions without a DB round-trip.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      if (isLoginPage) return true;
      return isLoggedIn;
    },
  },
};
