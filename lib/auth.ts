import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Dynamic import to avoid loading Prisma in Edge Runtime (middleware)
        const { prisma } = await import("@/lib/prisma");
        const existing = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              credits: 10,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "google") {
        const { prisma } = await import("@/lib/prisma");
        const dbUser = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.googleId = account.providerAccountId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      if (token.googleId) {
        (session.user as any).googleId = token.googleId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/api/auth/signin",
  },
});
