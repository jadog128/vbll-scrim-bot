import { NextAuthOptions, getServerSession } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'https://vbll-scrim.vercel.app';
}

const MOD_ROLE_ID = '1437082293725429842';
const ADMIN_ROLE_ID = '1288222067178868798';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1286206719847960670';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '1490695872776900708',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'xsL5oM5OFSusTcN_-k2tVbTCLqtxrGMN',
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
        token.accessToken = account.access_token || '';
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.discordId as string;
      session.user.discordId = token.discordId as string;
      session.user.accessToken = token.accessToken as string;

      // Check if user is the Owner
      const IS_OWNER = session.user.id === '1145402830786678884' || session.user.id === '1212823621005869106';

      if (token.accessToken && GUILD_ID) {
        try {
          const res = await fetch(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${token.accessToken}` } }
          );
          
          if (res.ok) {
            const member = await res.json();
            const roles: string[] = member.roles ?? [];
            
            const isHoster = roles.includes('1437082293725429842');
            const isAdmin = roles.includes('1288222067178868798');

            session.user.isManagement = IS_OWNER || isHoster || isAdmin || (member.permissions && (BigInt(member.permissions) & BigInt(8)) === BigInt(8));
            session.user.isAdmin = IS_OWNER || isAdmin || (member.permissions && (BigInt(member.permissions) & BigInt(8)) === BigInt(8));
          } else {
            session.user.isManagement = IS_OWNER;
            session.user.isAdmin = IS_OWNER;
          }
        } catch (e) {
          session.user.isManagement = IS_OWNER;
        }
      } else {
        session.user.isManagement = IS_OWNER;
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
