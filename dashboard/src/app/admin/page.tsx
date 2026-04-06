'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingClaims: 0,
    activeScrims: 0,
    totalPoints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && !session.user.isManagement)) {
      router.push('/');
      return;
    }
    
    if (session?.user.isManagement) {
      fetch('/api/admin/stats')
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        });
    }
  }, [session, status, router]);

  if (loading) return <div className="page"><p>Loading Admin Dashboard...</p></div>;

  const adminCards = [
    { title: '⭐ Review Claims', desc: `${stats.pendingClaims} claims waiting`, link: '/admin/claims', icon: '📋', color: 'var(--yellow)' },
    { title: '🛍️ Shop Management', desc: 'Add or restock items', link: '/admin/shop', icon: '⚙️', color: 'var(--accent)' },
    { title: '🛠️ Management Hub', desc: 'Mass DM & Scrim Posts', link: '/admin/management', icon: '📣', color: 'var(--green)' },
    // New pages I'll create
    { title: '👤 User Manager', desc: 'Edit player points', link: '/admin/users', icon: '👥', color: 'var(--accent2)' },
    { title: '📦 Redemptions', desc: 'Process shop orders', link: '/admin/redemptions', icon: '📥', color: 'var(--muted)' },
  ];

  return (
    <main className="page">
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-subtitle">Overview of VBLL Scrim Bot operations and management tools.</p>

      <div className="stats" style={{ marginBottom: 40 }}>
        <div className="stat-card">
          <div className="stat-label">Total Players</div>
          <div className="stat-val">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Claims</div>
          <div className="stat-val" style={{ color: stats.pendingClaims > 0 ? 'var(--yellow)' : 'inherit' }}>{stats.pendingClaims}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Points in Circulation</div>
          <div className="stat-val" style={{ fontSize: 22 }}>⭐ {stats.totalPoints.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Scrims</div>
          <div className="stat-val">{stats.activeScrims}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontFamily: 'Outfit', marginBottom: 20 }}>Management Tools</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {adminCards.map(card => (
          <Link key={card.link} href={card.link}>
            <div className="card" style={{ borderLeft: `4px solid ${card.color}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 32 }}>{card.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>{card.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{card.desc}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
