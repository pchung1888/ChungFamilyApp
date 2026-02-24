import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      // Auto-link the authenticated User to a FamilyMember with a matching email.
      // We look up by email because user.id here is the OAuth provider's sub ID,
      // not the database cuid — the adapter creates the DB record separately.
      try {
        if (user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            await prisma.familyMember.updateMany({
              where: { email: user.email, userId: null },
              data: { userId: dbUser.id },
            });
          }
        }
      } catch (err) {
        console.error("[auth] FamilyMember link failed:", err);
        // Never block sign-in due to a linking error
      }
      return true;
    },
  },
});
