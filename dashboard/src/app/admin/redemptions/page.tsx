'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Redemption {
  id: number;
  discord_id: string;
  username: string;
  item_name: string;
  cost: number;
  status: string;
  public_id: string;
  player_game_id: string;
  created_at: string;
}

export default function AdminRedemptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'fulfilled' | 'rejected'>('all');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/redemptions')
      .then(r => r.json())
      .then(data => { setRedemptions(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && !session?.user?.isManagement) { router.push('/'); return; }
    if (status === 'authenticated') fetchData();
  }, [status, session, fetchData, router]);

  const filtered = filter === 'all' ? redemptions : redemptions.filter(r => r.status === filter);
  const counts = {
    pending: redemptions.filter(r => r.status === 'pending').length,
    fulfilled: redemptions.filter(r => r.status === 'fulfilled').length,
    rejected: redemptions.filter(r => r.status === 'rejected').length,
  };

  if (status === 'loading' || loading) {
    return (
      <main className="page">
        <h1 className="page-title">📦 Redemptions</h1>
        <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
      </main>
    );
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="page-title">📦 Redemptions</h1>
        <button className="btn btn-ghost" onClick={fetchData}>🔄 Refresh</button>
      </div>
      <p className="page-subtitle">Last 50 shop redemptions</p>

      <div className="stats" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-val" style={{ color: 'var(--yellow)' }}>{counts.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fulfilled</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>{counts.fulfilled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>{counts.rejected}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Pts Spent</div>
          <div className="stat-val">{redemptions.reduce((s, r) => s + r.cost, 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'fulfilled', 'rejected'] as const).map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-accent' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', textTransform: 'capitalize' }}
          >
            {f} {f !== 'all' && `(${counts[f]})`}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Order ID</th>
                <th>Player</th>
                <th>VRFS ID</th>
                <th>Item</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                    No redemptions found
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--muted)' }}>{r.id}</td>
                  <td>
                    <code style={{ background: 'var(--bg3)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>
                      {r.public_id || '—'}
                    </code>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.discord_id}</div>
                  </td>
                  <td>
                    <code style={{ fontSize: 12, color: 'var(--accent2)' }}>{r.player_game_id || '—'}</code>
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.item_name}</td>
                  <td style={{ color: 'var(--yellow)', fontWeight: 600 }}>⭐ {r.cost}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
