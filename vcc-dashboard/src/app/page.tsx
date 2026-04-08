'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

interface VccRequest {
  id: number;
  discord_id: string;
  username: string;
  type: string;
  status: string;
  proof_url?: string;
}

export default function VccDashboard() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<VccRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    const res = await fetch('/api/requests');
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'authenticated') fetchRequests();
  }, [status]);

  const updateStatus = async (id: number, newStatus: string) => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) fetchRequests();
  };

  if (status === 'loading') {
    return (
      <div className="page" style={{ textAlign: 'center', marginTop: 100 }}>
        <div className="glass-card" style={{ maxWidth: 300, margin: '0 auto' }}>
          <p>Initializing Secure Session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '80vh' 
      }}>
        <div className="glass-card" style={{ 
          maxWidth: 450, 
          width: '100%', 
          textAlign: 'center',
          padding: '50px'
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🛡️</div>
          <h1 style={{ fontSize: 32, marginBottom: 12 }}>VCC Admin Hub</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 40 }}>Access requires VCC Staff authentication.</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => signIn('discord')}>
            Login with Discord
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page"><div className="glass-card">Synchronizing Request Queue...</div></div>;

  return (
    <main className="page">
      <div className="glow" style={{ top: '-10%', left: '-10%' }}></div>
      <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🛡️ VCC Control Panel</h1>
          <p style={{ color: 'var(--muted)' }}>Manage custom item requests and fulfillment</p>
        </div>
        <Link href="/admin/security" className="btn btn-primary" style={{ background: 'linear-gradient(to right, #ef4444, #000)', border: 'none' }}>
          🛡️ SECURITY SOC
        </Link>
      </header>

      <section className="queue">
        <h2>📥 Request Queue</h2>
        <div style={{ marginTop: 20 }}>
          {requests.map(req => (
            <div key={req.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>#{req.id}</div>
                  <div style={{ fontWeight: 600 }}>{req.type}</div>
                </div>
                <div className={`status-badge`} style={{ background: req.status === 'pending' ? 'var(--accent)' : 'var(--success)' }}>
                  {req.status}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14 }}>Player: <strong>{req.username}</strong></p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Discord: {req.discord_id}</p>
                </div>
                {req.proof_url && (
                  <a href={req.proof_url} target="_blank" className="btn btn-ghost" style={{ border: '1px solid var(--border)' }}>🖼️ View Proof</a>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {req.status === 'pre_review' && (
                  <button className="btn btn-primary" onClick={() => updateStatus(req.id, 'pending')}>Verify & Queue</button>
                )}
                {req.status === 'pending' && (
                  <button className="btn btn-success" onClick={() => updateStatus(req.id, 'completed')}>Fulfill</button>
                )}
                <button className="btn btn-danger" onClick={() => updateStatus(req.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p style={{ color: 'var(--muted)' }}>No requests found in the database.</p>}
        </div>
      </section>
    </main>
  );
}
