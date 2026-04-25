'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, Zap, Save, X } from 'lucide-react';

interface CustomCommand {
  id: number;
  name: string;
  content: string;
}

export default function CommandWorkshop() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomCommand | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (session?.user?.isManagement) fetchCommands();
  }, [session, status]);

  const fetchCommands = async () => {
    const res = await fetch('/api/admin/commands');
    const data = await res.json();
    setCommands(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing?.id, name, content })
    });
    if (res.ok) {
      await fetchCommands();
      closeModal();
    } else {
      alert('Error saving command. Ensure the name is unique.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This command will stop working immediately.')) return;
    const res = await fetch(`/api/admin/commands?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchCommands();
  };

  const openModal = (command: CustomCommand | null = null) => {
    setEditing(command);
    setName(command?.name || '');
    setContent(command?.content || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setName('');
    setContent('');
  };

  if (loading) return <main className="page"><div className="loading-container">Loading Workshop...</div></main>;

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 className="page-title">🎨 Bot Designer</h1>
          <p className="page-subtitle">Configure your bot's personality, presence, and instant commands.</p>
        </div>
        <button className="btn btn-accent" onClick={() => openModal()}>
          <Plus size={18} /> New Component
        </button>
      </div>

      <div className="grid-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        <div className="card" style={{ gridColumn: '1 / -1', background: 'var(--bg3)', border: '1px dashed var(--accent)', padding: 24, borderRadius: 12, marginBottom: 20 }}>
           <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>⚡ Instant Slash Commands</h2>
           <p style={{ color: 'var(--muted)', fontSize: 13 }}>These commands are injected directly into the Discord bot interaction loop.</p>
        </div>
        {commands.map(cmd => (
          <div key={cmd.id} className="card command-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: 'rgba(255, 215, 0, 0.1)', borderRadius: 8, color: 'var(--yellow)' }}>
                  <Zap size={20} />
                </div>
                <h3 style={{ fontWeight: 800, letterSpacing: 0.5 }}>/{cmd.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" onClick={() => openModal(cmd)} title="Edit"><Edit2 size={16} /></button>
                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(cmd.id)} title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden' }}>
              {cmd.content}
            </div>
          </div>
        ))}
        {commands.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            No custom commands found. Click "New Command" to get started!
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{editing ? 'Edit Command' : 'Create Command'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, color: 'var(--accent)' }}>Command Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>/</span>
                  <input 
                    type="text" 
                    className="input" 
                    style={{ paddingLeft: 24 }}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.target.value rules" 
                  />
                </div>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Lowercase and hyphens only.</p>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, color: 'var(--accent)' }}>Response Content</label>
                <textarea 
                  className="input" 
                  rows={6}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="The message the bot will send..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                   {saving ? 'Saving...' : <><Save size={18} /> Save Command</>}
                </button>
                <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .btn-icon {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
        .btn-icon-danger:hover {
          background: rgba(255, 77, 77, 0.2);
          border-color: rgba(255, 77, 77, 0.4);
          color: #ff4d4d;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
      `}</style>
    </main>
  );
}
