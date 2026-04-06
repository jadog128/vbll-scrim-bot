import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'https://vrdl-dashboard-direct.vercel.app';
}

const handler = NextAuth({
  ...authOptions,
  secret: process.env.NEXTAUTH_SECRET || '4255603c885777ed7cc31c63253fbc01cfdb7b4fa769da1b01f508aa8d398449',
});
export { handler as GET, handler as POST };
