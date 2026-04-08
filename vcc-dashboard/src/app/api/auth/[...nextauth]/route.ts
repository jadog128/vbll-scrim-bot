import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

if (process.env.VCC_NEXTAUTH_URL && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VCC_NEXTAUTH_URL;
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
