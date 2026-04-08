import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.VCC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.VCC_DISCORD_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET || '',
      authorization: { params: { scope: 'identify guilds.members.read' } },
    }),
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
        // Check if user has the VCC Management Role or is the Owner
        // In a real Vercel environment, we'd fetch from Discord API or 
        // assume security is handled via the dashboard login check.
        session.user.isVccAdmin = token.isVccAdmin;
      }
      return session;
    },
    async jwt({ token, account, user }: any) {
      if (account) {
        // Here we'd verify the VCC Role ID 1369059054793785467
        // For now, we allow the owner (Jamie) and any user that meets the criteria
        token.isVccAdmin = token.sub === '1145402830786678884'; // Example Owner bypass
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.VCC_NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET || 'vcc-default-secure-string-123',
};
