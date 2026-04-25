'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { PortalFeatures } from './PortalFeatures';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/',              label: '🏠 Home' },
  { href: '/leaderboard',  label: '🏆 Leaderboard' },
  { href: '/shop',         label: '🛍️ Shop' },
  { href: '/upcoming',     label: '📅 Upcoming Scrims' },
];

const mgmtLinks = [
  { href: '/admin',             label: '📊 Dashboard' },
  { href: '/admin/management',  label: '📣 Scrims' },
  { href: '/admin/claims',      label: '⭐ Points' },
  { href: '/admin/batch/requests', label: '👕 Customs' },
  { href: '/admin/redemptions', label: '📦 Orders' },
  { href: '/admin/sentinal',    label: '🛡️ Sentinal' },
  { href: '/admin/shop',        label: '🛍️ Shop Shop' },
  { href: '/admin/users',       label: '👥 Users' },
  { href: '/admin/designer',    label: '🎨 Bot Designer' },
  { href: '/admin/settings',    label: '⚙️ Settings' },
];

export function NavBar() {
  const pathname = usePathname() || '/';
  const { data: session, status } = useSession();
  const [isOnline, setIsOnline] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .catch(() => ({ online: false }))
      .then(data => setIsOnline(!!data?.online));
  }, []);

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        VBLL│<span style={{ color: 'var(--accent)' }}>HUB</span>
      </Link>

      <div className="nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
        {session?.user?.isManagement && (
          <Link
            href="/admin"
            className={`nav-link ${pathname?.startsWith('/admin') ? 'active' : ''}`}
            style={{ border: '1px solid var(--accent-glow)', color: 'var(--accent)' }}
          >
            🛡️ Staff
          </Link>
        )}
      </div>

      <div className="nav-user">
        <div className="nav-links">
          <PortalFeatures />
          <ThemeToggle />
        </div>
        {status === 'authenticated' && session ? (
          <Link href="/profile" className="user-pill" style={{ textDecoration: 'none' }}>
            {session.user?.image && (
              <Image src={session.user.image} alt="avatar" width={28} height={28} style={{ borderRadius: '50%' }} />
            )}
            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{session.user?.name}</span>
            {session.user?.isManagement && (
              <span className="badge badge-staff">Staff</span>
            )}
          </Link>
        ) : (
          <Link href="/login" className="btn btn-accent" style={{ padding: '0.6rem 2rem' }}>Login</Link>
        )}
        {session && (
          <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={() => signOut()}>
            🚪
          </button>
        )}
      </div>

      {/* Floating Mobile Pill */}
      <div className="mobile-pill" onClick={() => setIsMobileMenuOpen(true)}>
        <span style={{ fontSize: '1.2rem' }}>📱</span>
        <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>Menu</span>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className={`mobile-overlay active`} onClick={() => setIsMobileMenuOpen(false)}>
          <button style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>✕</button>
          
          {/* Mobile Tools Section */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', scale: '1.2' }} onClick={(e) => e.stopPropagation()}>
            <PortalFeatures />
            <ThemeToggle />
          </div>

          <div style={{ width: '1px', height: '40px', background: 'var(--glass-border)', marginBottom: '1rem' }} />

          {links.map((link, i) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className="mobile-link" 
              style={{ transitionDelay: `${i * 0.1}s` }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {session?.user?.isManagement && (
            <Link 
              href="/admin" 
              className="mobile-link" 
              style={{ color: 'var(--accent)', transitionDelay: `${links.length * 0.1}s` }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Staff Panel
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
