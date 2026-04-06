'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface UserProfile {
  points: number;
  rank: number | null;
  requests: any[];
  redemptions: any[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          setLoading(false);
        });
    }
  }, [status]);

  if (status === 'loading' || loading) return <div className="page"><p>Loading profile...</p></div>;
  if (status === 'unauthenticated') return <div className="page"><p>Please sign in to view your profile.</p></div>;

  return (
    <main className="page">
      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          {session?.user?.image && (
            <Image 
              src={session.user.image} 
              alt="Avatar" 
              width={80} 
              height={80} 
              style={{ borderRadius: '50%', border: '4px solid var(--accent)' }}
            />
          )}
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{session?.user?.name}</h1>
            <p className="page-subtitle">Personal Scrim Dashboard</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Points</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)' }}>{profile?.points.toLocaleString()}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Rank</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--text)' }}>#{profile?.rank || '?'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>⭐ Recent Points Claims</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Points</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profile?.requests.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No recent claims</td></tr>
                  ) : (
                    profile?.requests.map((r: any) => (
                      <tr key={r.id}>
                        <td>{r.description}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>+{r.amount}</td>
                        <td>
                          <span className={`badge badge-${r.status}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>🛍️ Recent Redemptions</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profile?.redemptions.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No recent redemptions</td></tr>
                  ) : (
                    profile?.redemptions.map((r: any) => (
                      <tr key={r.id}>
                        <td>{r.item_name}</td>
                        <td style={{ fontWeight: 600, color: 'var(--error)' }}>-{r.cost}</td>
                        <td>
                          <span className={`badge badge-${r.status}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
