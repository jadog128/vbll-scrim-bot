import { NextAuthOptions, getServerSession } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'https://vrdl-dashboard-direct.vercel.app';
}

const MOD_ROLE_ID = '1437082293725429842';
const ADMIN_ROLE_ID = '1288222067178868798';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1212823621005869106';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '1483525029923786873',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'XnuIh0dlNRGex35twnZdKOYQMosAV8uq',
      authorization: {
        params: {
          scope: 'identify guilds.members.read',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = (profile as { id: string }).id;
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId as string;
      session.user.accessToken = token.accessToken as string;

      // Check if user has Scrim Management role in the guild
      if (token.accessToken && GUILD_ID) {
        try {
          const res = await fetch(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${token.accessToken}` } }
          );
          if (res.ok) {
            const member = await res.json();
            const roles: string[] = member.roles ?? [];
            // Check role or Administrator permission bit
            session.user.isManagement =
              roles.includes(MOD_ROLE_ID) ||
              roles.includes(ADMIN_ROLE_ID) ||
              (member.permissions && (BigInt(member.permissions) & BigInt(8)) === BigInt(8));
            
            session.user.isAdmin = roles.includes(ADMIN_ROLE_ID) || (member.permissions && (BigInt(member.permissions) & BigInt(8)) === BigInt(8));
          } else {
            session.user.isManagement = false;
          }
        } catch {
          session.user.isManagement = false;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || '4255603c885777ed7cc31c63253fbc01cfdb7b4fa769da1b01f508aa8d398449',
};

// Helper for server components and API routes
export const getAuth = () => getServerSession(authOptions);
