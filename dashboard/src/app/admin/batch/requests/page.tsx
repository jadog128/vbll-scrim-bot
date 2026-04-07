'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BatchRequest {
  id: number;
  discord_id: string;
  username: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

export default function AdminBatchRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<BatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRequests = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/batch/requests')
      .then(r => r.json())
      .then(data => { 
        setRequests(Array.isArray(data) ? data : []); 
        setLoading(false); 
      });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && !session?.user?.isManagement) { router.push('/'); return; }
    if (status === 'authenticated') fetchRequests();
  }, [status, session, fetchRequests, router]);

  const processRequest = async (requestId: number, action: 'approve' | 'complete' | 'reject') => {
    setProcessing(requestId);
    try {
      const res = await fetch('/api/admin/batch/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        showToast(`✅ Request ${action === 'complete' ? 'Fulfilled' : action}!`, 'success');
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error}`, 'error');
      }
    } catch {
      showToast('Network error. Try again.', 'error');
    }
    setProcessing(null);
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <main className="page">
        <h1 className="page-title">👕 Custom Orders</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="page-title">👕 Custom Orders</h1>
        <button className="btn btn-ghost" onClick={fetchRequests}>🔄 Refresh</button>
      </div>
      <p className="page-subtitle">Manage batch requests for jerseys, shoes, and other custom gear.</p>

      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Pending Customs</div>
          <div className="stat-val" style={{ color: 'var(--accent2)' }}>{requests.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total in Queue</div>
          <div className="stat-val">{requests.length}</div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ color: 'var(--muted)', fontSize: 16 }}>No custom requests waiting.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100%, 1fr))', gap: 16 }}>
          {requests.map(req => (
            <div key={req.id} className="card" style={{ borderLeft: `4px solid ${req.status === 'pending' ? 'var(--accent2)' : 'var(--accent)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>#{req.id} {req.type.toUpperCase()}</span>
                    <span className={`badge badge-${req.status === 'pending' ? 'pending' : 'approved'}`}>{req.status}</span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: '0.9rem' }}>
                    By <strong>{req.username}</strong> (<Link href={`/admin/users?q=${req.discord_id}`} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{req.discord_id}</Link>)
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {new Date(req.created_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{ margin: '16px 0', background: 'var(--bg3)', padding: 12, borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>Custom Details</div>
                <div style={{ color: '#fff', lineHeight: 1.5 }}>{req.details}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {req.status === 'pending' && (
                  <button 
                    className="btn btn-accent" 
                    disabled={processing === req.id}
                    onClick={() => processRequest(req.id, 'approve')}
                  >
                    {processing === req.id ? '...' : '✅ Approve'}
                  </button>
                )}
                <button 
                  className="btn btn-green" 
                  disabled={processing === req.id}
                  onClick={() => processRequest(req.id, 'complete')}
                >
                  {processing === req.id ? '...' : '📦 Fulfil'}
                </button>
                <button 
                  className="btn btn-red" 
                  disabled={processing === req.id}
                  onClick={() => processRequest(req.id, 'reject')}
                >
                  {processing === req.id ? '...' : '❌ Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </main>
  );
}
