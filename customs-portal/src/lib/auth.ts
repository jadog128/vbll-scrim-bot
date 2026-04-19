import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { isMemberAdmin } from "@/lib/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: "1491103459942989905",
      clientSecret: "d67TEmOW3O2GcsF6MwHJhsFMNmM0u6J2",
      authorization: { params: { scope: "identify email guilds" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (profile) {
        token.id = (profile as any).id;
        token.username = (profile as any).username;
      }
      if (account?.access_token) {
        try {
          const res = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });
          if (res.ok) {
            const guilds = await res.json();
            // Filter guilds where user has Administrator permission (0x8)
            const manageable = guilds.filter((g: any) => (BigInt(g.permissions) & BigInt(0x8)) === BigInt(0x8));
            token.manageableGuilds = manageable.map((g: any) => ({
              id: g.id,
              name: g.name,
              icon: g.icon
            }));
            token.isAdmin = manageable.length > 0;
          }
        } catch (e) {
          console.error("Failed to fetch guilds:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).isAdmin = token.isAdmin;
        (session.user as any).manageableGuilds = token.manageableGuilds;
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
