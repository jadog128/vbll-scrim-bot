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
  
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'settings'>('queue');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRequests = useCallback((filter: 'pending' | 'all' = 'pending') => {
    setLoading(true);
    fetch(`/api/admin/batch/requests?filter=${filter}`)
      .then(r => r.json())
      .then(data => { 
        setRequests(Array.isArray(data) ? data : []); 
        setLoading(false); 
      });
  }, []);

  const fetchSettings = useCallback(() => {
    fetch('/api/admin/batch/requests?type=settings')
      .then(r => r.json())
      .then(data => setSettings(data));
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && !session?.user?.isManagement) { router.push('/'); return; }
    if (status === 'authenticated') {
      if (activeTab === 'settings') fetchSettings();
      else fetchRequests(activeTab === 'queue' ? 'pending' : 'all');
    }
  }, [status, session, fetchRequests, fetchSettings, router, activeTab]);

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
        if (activeTab === 'queue') setRequests(prev => prev.filter(r => r.id !== requestId));
        else fetchRequests('all');
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error}`, 'error');
      }
    } catch {
      showToast('Network error. Try again.', 'error');
    }
    setProcessing(null);
  };

  const saveSetting = async (key: string, value: string) => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/batch/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'settings', key, value }),
      });
      if (res.ok) {
        showToast(`✅ Setting updated!`, 'success');
        fetchSettings();
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error}`, 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    }
    setSavingSettings(false);
  };

  if (status === 'loading' || (status === 'authenticated' && loading && activeTab !== 'settings')) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title">👕 Customs Hub</h1>
        <button className="btn btn-ghost" onClick={() => activeTab === 'settings' ? fetchSettings() : fetchRequests(activeTab === 'queue' ? 'pending' : 'all')}>🔄 Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 30, borderBottom: '1px solid var(--glass-border)', paddingBottom: 10 }}>
        <button 
          className={`nav-link ${activeTab === 'queue' ? 'active' : ''}`} 
          onClick={() => setActiveTab('queue')}
          style={{ background: activeTab === 'queue' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          Active Queue
        </button>
        <button 
          className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('history')}
          style={{ background: activeTab === 'history' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          History
        </button>
        <button 
          className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} 
          onClick={() => setActiveTab('settings')}
          style={{ background: activeTab === 'settings' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          Settings
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="card" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Batch Hub Settings</h2>
          <div className="form-group">
            <label>Review Channel ID</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                placeholder="Discord Channel ID" 
                defaultValue={settings.review_channel || ''}
                onBlur={(e) => saveSetting('review_channel', e.target.value)}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 8 }}>
              This is where the bot will post new requests for staff to review.
            </p>
          </div>
          {savingSettings && <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>⌛ Saving...</p>}
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ color: 'var(--muted)', fontSize: 16 }}>No custom requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100%, 1fr))', gap: 16 }}>
          {requests.map(req => (
            <div key={req.id} className="card" style={{ borderLeft: `4px solid ${req.status === 'pending' ? 'var(--accent2)' : req.status === 'completed' ? 'var(--green)' : 'var(--accent)'}` }}>
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
