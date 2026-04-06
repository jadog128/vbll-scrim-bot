'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

const links = [
  { href: '/',              label: '🏠 Home' },
  { href: '/leaderboard',  label: '🏆 Leaderboard' },
  { href: '/shop',         label: '🛍️ Shop' },
  { href: '/upcoming',     label: '📅 Upcoming Scrims' },
];

const mgmtLinks = [
  { href: '/admin/claims',      label: '⭐ Claims' },
  { href: '/admin/redemptions', label: '📦 Redemptions' },
  { href: '/admin/shop',        label: '🛍️ Shop' },
  { href: '/admin/management',  label: '🛠️ Management' },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setIsOnline(data.online));
  }, []);

  return (
    <nav className="nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="nav-logo">VBLL Scrim</span>
        <div 
          title={isOnline === null ? 'Checking...' : isOnline ? 'Bot Online' : 'Bot Offline'}
          style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            backgroundColor: isOnline === null ? 'var(--muted)' : isOnline ? '#00ff00' : '#ff4d4d',
            boxShadow: isOnline ? '0 0 12px #00ff00' : 'none',
            border: '2px solid rgba(255,255,255,0.2)'
          }} 
        />
      </div>

      {links.map(l => (
        <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? ' active' : ''}`}>
          {l.label}
        </Link>
      ))}

      <Link href="/search" className={`nav-link${pathname === '/search' ? ' active' : ''}`}>
        🔍 Search
      </Link>

      {session && (
        <Link href="/profile" className={`nav-link${pathname === '/profile' ? ' active' : ''}`}>
          👤 Profile
        </Link>
      )}

      {session?.user?.isManagement && mgmtLinks.map(l => (
        <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? ' active' : ''}`}>
          {l.label}
        </Link>
      ))}

      <span className="nav-spacer" />

      <div className="nav-user">
        {status === 'loading' ? null : session ? (
          <>
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt="avatar"
                width={32}
                height={32}
                className="nav-avatar"
              />
            )}
            <span>{session.user?.name}</span>
            {session.user?.isManagement && (
              <span className="badge badge-approved">Staff</span>
            )}
            <button className="btn btn-ghost" style={{ padding: '5px 12px' }} onClick={() => signOut()}>
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn-accent" style={{ padding: '6px 16px', borderRadius: 8 }}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
