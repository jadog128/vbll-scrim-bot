'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && !session.user.isAdmin)) {
      router.push('/');
      return;
    }
    
    if (session?.user.isAdmin) {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          setSettings(data.settings || {});
          setLoading(false);
        });
    }
  }, [session, status, router]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/settings/update', {
      method: 'POST',
      body: JSON.stringify({ settings })
    });
    setSaving(false);
    if (res.ok) {
      showToast('Settings saved successfully!');
    } else {
      showToast('Error saving settings', 'error');
    }
  };

  if (loading) return <div className="page"><p>Loading Global Settings...</p></div>;

  const settingGroups = [
    {
      title: '📢 Channel Configuration',
      fields: [
        { key: 'review_channel', label: 'Points Review Channel ID' },
        { key: 'log_channel', label: 'Public Log/Scrim Announcement Channel ID' },
        { key: 'redemption_channel', label: 'Shop Redemptions Internal Channel ID' },
        { key: 'fulfilment_channel', label: 'Staff Fulfilment Log Channel ID' },
        { key: 'audit_log_channel', label: 'Internal Audit Log Channel ID' },
      ]
    },
    {
      title: '⏸️ Bot Control',
      fields: [
        { key: 'requests_paused', label: 'Pause Scrim Claims (true/false)' },
        { key: 'audit_log_verbose', label: 'Verbose Logging (true/false)' },
      ]
    }
  ];

  return (
    <main className="page">
      <h1 className="page-title">Global Bot Settings</h1>
      <p className="page-subtitle">Manage Discord integration IDs and system states. Requires full Admin access.</p>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gap: 24 }}>
          {settingGroups.map(group => (
            <div key={group.title} className="card">
              <h2 style={{ fontSize: 18, fontFamily: 'Outfit', marginBottom: 16 }}>{group.title}</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                {group.fields.map(field => (
                  <div key={field.key} className="form-group">
                    <label>{field.label}</label>
                    <input 
                      type="text" 
                      value={settings[field.key] || ''} 
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder="Enter ID or Value..."
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="card" style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 20, zIndex: 10 }}>
            <button className="btn btn-green" style={{ width: 150 }} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save All'}
            </button>
          </div>
        </div>
      </form>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </main>
  );
}
