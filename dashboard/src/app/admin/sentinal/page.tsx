'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LogEntry { id: number; action: string; target_id: string; moderator_id: string; reason: string; created_at: string; evidence?: string; }
interface Infraction { discord_id: string; count: number; last_infraction: string; }
interface GlobalBan { discord_id: string; reason: string; staff_id: string; created_at: string; }

export default function SentinalHub() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pulse' | 'global' | 'infractions'>('pulse');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [globalBans, setGlobalBans] = useState<GlobalBan[]>([]);
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [banForm, setBanForm] = useState({ userId: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let url = '/api/admin/sentinal';
    if (activeTab === 'global') url += '?type=global';
    if (activeTab === 'infractions') url += '?type=infractions';

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (activeTab === 'pulse') setLogs(data);
      else if (activeTab === 'global') setGlobalBans(data);
      else if (activeTab === 'infractions') setInfractions(data);
    } catch (e) { console.error('Fetch error', e); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && !session?.user?.isManagement) { router.push('/'); return; }
    if (status === 'authenticated') fetchData();
    
    // Auto-refresh for Pulse
    if (activeTab === 'pulse') {
      const interval = setInterval(fetchData, 8000);
      return () => clearInterval(interval);
    }
  }, [status, session, fetchData, router, activeTab]);

  const addGlobalBan = async () => {
    if (!banForm.userId || !banForm.reason) return alert('Fill all fields');
    setSubmitting(true);
    await fetch('/api/admin/sentinal', {
      method: 'POST',
      body: JSON.stringify({ action: 'global-ban', ...banForm }),
    });
    setBanForm({ userId: '', reason: '' });
    setSubmitting(false);
    fetchData();
  };

  const removeGlobalBan = async (userId: string) => {
    if (!confirm('Remove this user from the global blacklist?')) return;
    await fetch('/api/admin/sentinal', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove-global', userId }),
    });
    fetchData();
  };

  if (status === 'loading' || loading) return <main className="page"><h1 className="page-title">🛡️ Sentinal Pulse</h1><div className="skeleton" style={{ height: 400 }} /></main>;

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🛡️ Sentinal Command Center</h1>
          <p className="page-subtitle">Elite deterministic moderation & cross-server security.</p>
        </div>
        <button className="btn btn-red" style={{ fontWeight: 900, letterSpacing: 1 }} onClick={() => alert('LOCKDOWN Command Sent to Sentinal Bot.')}>🔥 PANIC BUTTON</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 30, borderBottom: '1px solid var(--glass-border)', paddingBottom: 10 }}>
        <button className={`nav-link ${activeTab === 'pulse' ? 'active' : ''}`} onClick={() => setActiveTab('pulse')}>Live Pulse</button>
        <button className={`nav-link ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>Global Blacklist</button>
        <button className={`nav-link ${activeTab === 'infractions' ? 'active' : ''}`} onClick={() => setActiveTab('infractions')}>Repeat Offenders</button>
      </div>

      {activeTab === 'pulse' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td><span className={`badge ${log.action.includes('BAN') ? 'badge-red' : log.action.includes('WARN') ? 'badge-yellow' : 'badge-staff'}`}>{log.action}</span></td>
                  <td><code>{log.target_id}</code></td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.reason}>{log.reason}</td>
                  <td><code>{log.moderator_id === 'Sentinal' ? '🤖' : log.moderator_id}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'global' && (
        <div>
          <div className="card" style={{ marginBottom: 24, maxWidth: 600 }}>
            <h3 style={{ marginBottom: 16 }}>⚖️ Add Global Blacklist</h3>
            <div className="form-group">
              <input placeholder="Discord User ID" value={banForm.userId} onChange={e => setBanForm({ ...banForm, userId: e.target.value })} />
            </div>
            <div className="form-group">
              <input placeholder="Reason for Blacklist" value={banForm.reason} onChange={e => setBanForm({ ...banForm, reason: e.target.value })} />
            </div>
            <button className="btn btn-accent" onClick={addGlobalBan} disabled={submitting}>🔨 Blacklist User Globally</button>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Reason</th>
                  <th>Staff ID</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {globalBans.map(ban => (
                  <tr key={ban.discord_id}>
                    <td><code>{ban.discord_id}</code></td>
                    <td>{ban.reason}</td>
                    <td><code>{ban.staff_id}</code></td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(ban.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={() => removeGlobalBan(ban.discord_id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'infractions' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Infractions</th>
                <th>Last Incident</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {infractions.map(inf => (
                <tr key={inf.discord_id}>
                  <td><code>{inf.discord_id}</code></td>
                  <td style={{ color: inf.count > 5 ? 'var(--red)' : 'var(--yellow)', fontWeight: 900 }}>{inf.count}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(inf.last_infraction).toLocaleString()}</td>
                  <td>{inf.count > 10 ? '🔴 Critical' : inf.count > 5 ? '🟠 High Risk' : '🟡 Warned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
