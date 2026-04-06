'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [roles, setRoles] = useState<{ id: string, name: string }[]>([]);
  const [scrims, setScrims] = useState<{ id: number, title: string, time: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mass DM State
  const [massDmRole, setMassDmRole] = useState('');
  const [massDmMsg, setMassDmMsg] = useState('');
  const [dmPending, setDmPending] = useState(false);
  
  // Post Scrim State
  const [scrimTitle, setScrimTitle] = useState('');
  const [scrimTime, setScrimTime] = useState('');
  const [scrimPoints, setScrimPoints] = useState(10);
  const [postPending, setPostPending] = useState(false);
  
  // Message Participants State
  const [targetScrim, setTargetScrim] = useState('');
  const [partMsg, setPartMsg] = useState('');
  const [partPending, setPartPending] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && !session.user.isManagement)) {
      router.push('/');
      return;
    }
    
    if (session?.user.isManagement) {
      Promise.all([
        fetch('/api/admin/roles').then(res => res.json()),
        fetch('/api/admin/scrims').then(res => res.json())
      ]).then(([rolesData, scrimsData]) => {
        setRoles(rolesData.roles || []);
        setScrims(scrimsData.scrims || []);
        setLoading(false);
      });
    }
  }, [session, status, router]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMassDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!massDmRole || !massDmMsg) return;
    setDmPending(true);
    const res = await fetch('/api/admin/mass-dm', {
      method: 'POST',
      body: JSON.stringify({ roleId: massDmRole, message: massDmMsg })
    });
    setDmPending(false);
    if (res.ok) {
      showToast('Mass DM sent successfully!');
      setMassDmMsg('');
    } else {
      showToast('Error sending Mass DM', 'error');
    }
  };

  const handlePostScrim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostPending(true);
    const res = await fetch('/api/admin/post-scrim', {
      method: 'POST',
      body: JSON.stringify({ title: scrimTitle, time: scrimTime, points: scrimPoints })
    });
    setPostPending(false);
    if (res.ok) {
      showToast('Scrim posted successfully!');
      setScrimTitle('');
      setScrimTime('');
      // Refresh scrims list
      fetch('/api/admin/scrims').then(r => r.json()).then(d => setScrims(d.scrims || []));
    } else {
      showToast('Error posting scrim', 'error');
    }
  };

  const handleMessageParticipants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetScrim || !partMsg) return;
    setPartPending(true);
    const res = await fetch('/api/admin/message-participants', {
      method: 'POST',
      body: JSON.stringify({ scrimId: targetScrim, message: partMsg })
    });
    setPartPending(false);
    if (res.ok) {
      showToast('Message sent to participants!');
      setPartMsg('');
    } else {
      showToast('Error sending message', 'error');
    }
  };

  if (loading) return <div className="page"><p>Loading Management Hub...</p></div>;

  return (
    <main className="page">
      <h1 className="page-title">Management Hub</h1>
      <p className="page-subtitle">Control VBLL Bot commands and announcements directly from the dashboard.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
        
        {/* Mass DM Section */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 18, fontFamily: 'Outfit' }}>📣 Mass DM Command</h2>
          <form onSubmit={handleMassDm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label>Target Role</label>
              <select value={massDmRole} onChange={e => setMassDmRole(e.target.value)} required>
                <option value="">Select a role...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Message Content</label>
              <textarea 
                placeholder="Type your message here..." 
                value={massDmMsg} 
                onChange={e => setMassDmMsg(e.target.value)}
                style={{ height: 100 }}
                required
              />
            </div>
            <button className="btn btn-accent" disabled={dmPending || !session?.user.isAdmin}>
              {dmPending ? 'Sending...' : 'Send Mass DM'}
            </button>
            {!session?.user.isAdmin && <p style={{ fontSize: 11, color: 'var(--red)' }}>⚠️ Requires Admin permission.</p>}
          </form>
        </section>

        {/* Post Scrim Section */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 18, fontFamily: 'Outfit' }}>⚽ Post Scrim Command</h2>
          <form onSubmit={handlePostScrim} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label>Scrim Title</label>
              <input type="text" placeholder="e.g. Saturday Night Scrim" value={scrimTitle} onChange={e => setScrimTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="text" placeholder="e.g. Tonight at 8PM" value={scrimTime} onChange={e => setScrimTime(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Reward Points</label>
              <input type="number" value={scrimPoints} onChange={e => setScrimPoints(parseInt(e.target.value))} required />
            </div>
            <button className="btn btn-green" disabled={postPending}>
              {postPending ? 'Posting...' : 'Post Scrim Announcement'}
            </button>
          </form>
        </section>

        {/* Message Scrim Members Section */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 18, fontFamily: 'Outfit' }}>📩 Message Scrim Participants</h2>
          <form onSubmit={handleMessageParticipants} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label>Select Scrim</label>
              <select value={targetScrim} onChange={e => setTargetScrim(e.target.value)} required>
                <option value="">Select a recent scrim...</option>
                {scrims.map(s => <option key={s.id} value={s.id}>{s.title} ({s.time})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Message for Participants</label>
              <textarea 
                placeholder="Message all members who joined this scrim..." 
                value={partMsg} 
                onChange={e => setPartMsg(e.target.value)}
                style={{ height: 100 }}
                required
              />
            </div>
            <button className="btn btn-accent" disabled={partPending}>
              {partPending ? 'Messaging...' : 'Message Participants'}
            </button>
          </form>
        </section>

      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </main>
  );
}
