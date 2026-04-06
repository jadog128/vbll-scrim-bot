'use client';

import { useEffect, useState } from 'react';

interface ScrimEvent { id: number; title: string; time: string; reward: number; }

export default function UpcomingPage() {
  const [events, setEvents] = useState<ScrimEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/upcoming')
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false); });
  }, []);

  return (
    <main className="page">
      <h1 className="page-title">📅 Upcoming Scrims</h1>
      <p className="page-subtitle">Scheduled events and their point rewards — added by management via <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>/scrim-add</code></p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <p style={{ color: 'var(--muted)' }}>No upcoming scrims scheduled right now — check back later!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(ev => (
            <div key={ev.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 36 }}>⚽</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{ev.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>🕒 {ev.time}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Reward</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>⭐ {ev.reward}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
