'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UserManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newPoints, setNewPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && !session.user.isManagement)) {
      router.push('/');
    }
  }, [session, status, router]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const handleUpdatePoints = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    const res = await fetch('/api/admin/users/update-points', {
      method: 'POST',
      body: JSON.stringify({ discordId: editingUser.discord_id, points: newPoints })
    });
    setSubmitting(false);
    if (res.ok) {
      showToast(`${editingUser.username}'s points updated!`);
      // Update local state
      setUsers(users.map(u => u.discord_id === editingUser.discord_id ? { ...u, points: newPoints } : u));
      setEditingUser(null);
    } else {
      showToast('Error updating points', 'error');
    }
  };

  return (
    <main className="page">
      <h1 className="page-title">User Management</h1>
      <p className="page-subtitle">Search for players to view or adjust their point balances.</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <input 
            placeholder="Search by Username or Discord ID..." 
            value={query} 
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn btn-accent" disabled={loading} style={{ width: 120 }}>
            {loading ? '...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="card" style={{ background: 'var(--glass)', border: 'none' }}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Discord ID</th>
              <th>⭐ Points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>No players found.</td></tr>
            )}
            {users.map(user => (
              <tr key={user.discord_id}>
                <td style={{ fontWeight: 700 }}>{user.username}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{user.discord_id}</td>
                <td style={{ color: 'var(--green)', fontWeight: 800 }}>{user.points.toLocaleString()}</td>
                <td>
                  <button className="btn btn-ghost" onClick={() => { setEditingUser(user); setNewPoints(user.points); }}>
                    ✎ Edit Points
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Edit Points for {editingUser.username}</h2>
            <div className="form-group">
              <label>Current: {editingUser.points.toLocaleString()} pts</label>
              <input 
                type="number" 
                value={newPoints} 
                onChange={e => setNewPoints(parseInt(e.target.value))} 
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-green" style={{ flex: 1 }} onClick={handleUpdatePoints} disabled={submitting}>
                {submitting ? '...' : 'Save Balance'}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </main>
  );
}
