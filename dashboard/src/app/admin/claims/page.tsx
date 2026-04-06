'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Claim {
  id: number;
  discord_id: string;
  username: string;
  amount: number;
  description: string;
  proof_url: string;
  status: string;
  created_at: string;
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

export default function AdminClaimsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClaims = useCallback(() => {
    setLoading(true);
    fetch('/api/claims')
      .then(r => r.json())
      .then(data => { setClaims(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && !session?.user?.isManagement) { router.push('/'); return; }
    if (status === 'authenticated') fetchClaims();
  }, [status, session, fetchClaims, router]);

  const review = async (claimId: number, action: 'approve' | 'reject') => {
    setProcessing(claimId);
    try {
      const res = await fetch('/api/claims/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(action === 'approve' ? `✅ Approved! New balance: ${data.newPoints} pts` : '❌ Claim rejected.', action === 'approve' ? 'success' : 'error');
        setClaims(prev => prev.filter(c => c.id !== claimId));
      } else {
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
        <h1 className="page-title">⭐ Point Claims</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="page-title">⭐ Point Claims</h1>
        <button className="btn btn-ghost" onClick={fetchClaims}>🔄 Refresh</button>
      </div>
      <p className="page-subtitle">Review and approve or reject pending point claim requests</p>

      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Pending Claims</div>
          <div className="stat-val" style={{ color: 'var(--yellow)' }}>{claims.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Points Requested</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {claims.reduce((s, c) => s + c.amount, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <p style={{ color: 'var(--muted)', fontSize: 16 }}>All caught up! No pending claims.</p>
        </div>
      ) : (
        claims.map(claim => (
          <div key={claim.id} className="claim-card">
            <div className="claim-header">
              <div style={{ flex: 1 }}>
                <div className="claim-user">
                  {claim.username}
                  <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>#{claim.id}</span>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{claim.discord_id}</div>
              </div>
              <div className="claim-pts">+{claim.amount} pts</div>
              <span className="badge badge-pending">Pending</span>
            </div>

            <div className="claim-desc">📝 {claim.description}</div>

            {claim.proof_url && (
              <div className="claim-proof">
                <Image
                  src={claim.proof_url}
                  alt="proof screenshot"
                  width={800}
                  height={400}
                  style={{ width: '100%', height: 'auto', maxHeight: 300, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }}
                  unoptimized
                />
                <a href={claim.proof_url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', color: 'var(--accent2)', fontSize: 12, marginTop: 4 }}>
                  Open full image ↗
                </a>
              </div>
            )}

            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              🕒 {new Date(claim.created_at).toLocaleString()}
            </div>

            <div className="claim-actions">
              <button
                className="btn btn-green"
                disabled={processing === claim.id}
                onClick={() => review(claim.id, 'approve')}
              >
                {processing === claim.id ? '⏳ Processing…' : '✅ Approve'}
              </button>
              <button
                className="btn btn-red"
                disabled={processing === claim.id}
                onClick={() => review(claim.id, 'reject')}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </main>
  );
}
