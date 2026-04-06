import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'VRDL Scrim Hub',
  description: 'VRDL Scrim Bot Dashboard — leaderboards, shop, and management tools',
};
export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error('[Session Error]', e);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers session={session}>
          <div className="glow-wrapper">
            <div className="glow-1"></div>
            <div className="glow-2"></div>
          </div>
          <Suspense fallback={<div style={{ height: '70px' }} />}>
            <NavBar />
          </Suspense>
          <main className="page">
            <Suspense fallback={<div className="loading-state">Loading...</div>}>
              {children}
            </Suspense>
          </main>
        </Providers>
      </body>
    </html>
  );
}
