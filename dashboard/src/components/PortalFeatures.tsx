'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function PortalFeatures() {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{ players: any[], items: any[] }>({ players: [], items: [] });
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Ctrl+K Search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults({ players: [], items: [] });
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Notifications
  useEffect(() => {
    if (!session) return;
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setNotifications(data.notifications || []));
  }, [session]);

  // Close notif on outside click
  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  return (
    <>
      <div className="nav-icons" ref={notifRef}>
        <button className="icon-btn" onClick={() => setSearchOpen(true)} title="Search (Ctrl+K)">🔍</button>
        <button className="icon-btn" onClick={() => setNotifOpen(!notifOpen)} title="Notifications">
          🔔
          {notifications.length > 0 && <div className="badge-dot" />}
        </button>

        {notifOpen && (
          <div className="notification-dropdown card">
            <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: 1, marginBottom: 12 }}>
              NOTIFICATIONS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.length > 0 ? notifications.map((n, i) => (
                <div key={i} style={{ padding: 12, background: 'var(--bg2)', borderRadius: 12, borderLeft: `3px solid ${n.status === 'approved' ? 'var(--green)' : n.status === 'rejected' ? 'var(--red)' : 'var(--accent)'}` }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{n.type === 'claim' ? 'Stat Claim' : 'Shop Order'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>Status: <span style={{ color: n.status === 'approved' ? 'var(--green)' : 'inherit' }}>{n.status}</span></div>
                </div>
              )) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center', padding: '1rem 0' }}>No new notifications.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {searchOpen && (
        <div className="search-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
          <div className="search-box">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search players or items..."
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.players.length > 0 && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: 1 }}>PLAYERS</div>
                  {results.players.map(p => (
                    <Link key={p.discordId} href={`/profile/${p.discordId}`} onClick={() => setSearchOpen(false)} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>👤 {p.username}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>⭐ {p.points}</span>
                    </Link>
                  ))}
                </>
              )}
              {results.items.length > 0 && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: 1 }}>REWARDS</div>
                  {results.items.map(i => (
                    <Link key={i.id} href="/shop" onClick={() => setSearchOpen(false)} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>🎁 {i.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--yellow)' }}>{i.cost} Pts</span>
                    </Link>
                  ))}
                </>
              )}
              {searchQuery.length >= 2 && results.players.length === 0 && results.items.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No matches found for "{searchQuery}"</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
