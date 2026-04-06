import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      discordId: string;
      accessToken: string;
      isManagement: boolean;
      isAdmin: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string;
    accessToken?: string;
  }
}
