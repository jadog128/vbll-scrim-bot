import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { isMemberAdmin } from "@/lib/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: (process.env.VBLL_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID)!,
      clientSecret: (process.env.VBLL_DISCORD_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET)!,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.id = (profile as any).id;
        token.username = (profile as any).username;
        token.isAdmin = await isMemberAdmin(token.id as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).isAdmin = token.isAdmin;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.VBLL_NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET || "vbll_default_secret_change_me",
  debug: true,
};
