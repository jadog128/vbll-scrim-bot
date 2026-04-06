'use client';

import { useEffect, useState } from 'react';

interface Player { discord_id: string; username: string; points: number; }

const MEDALS = ['🥇', '🥈', '🥉'];
const COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoading(false); });
  }, []);

  return (
    <main className="page">
      <h1 className="page-title">🏆 Scrim Leaderboard</h1>
      <p className="page-subtitle">Top 25 players ranked by total scrim points</p>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />
            ))}
          </div>
        ) : players.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>No players on the leaderboard yet!</p>
        ) : (
          players.map((p, i) => (
            <div key={p.discord_id} className="lb-row" style={i < 3 ? { background: `${COLORS[i]}08`, borderLeft: `3px solid ${COLORS[i]}` } : {}}>
              <span className="lb-rank" style={i < 3 ? { color: COLORS[i] } : { color: 'var(--muted)' }}>
                {MEDALS[i] ?? `#${i + 1}`}
              </span>
              <div className="lb-name">
                <span>{p.username}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{p.discord_id}</span>
              </div>
              <span className="lb-pts">{p.points.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
