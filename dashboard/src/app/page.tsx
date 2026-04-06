'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 }}>
        <div style={{ 
          fontSize: 80, 
          filter: 'drop-shadow(0 0 20px var(--accent))',
          animation: 'pulse 2s infinite ease-in-out'
        }}>⚽</div>
        <h1 className="page-title" style={{ fontSize: 60, letterSpacing: '-1.5px', background: 'linear-gradient(to right, #fff, var(--muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          VBLL Scrim Bot
        </h1>
        <p className="page-subtitle" style={{ maxWidth: 600, fontSize: 18, color: 'var(--muted)', lineHeight: '1.6' }}>
          Automated scrim management, point tracking, and rewards system for the official VB League.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, width: '100%', maxWidth: 900, marginTop: 40 }}>
          {[
            { href: '/leaderboard',  icon: '🏆', title: 'Leaderboard',      desc: 'Top 25 players by points' },
            { href: '/shop',         icon: '🛍️', title: 'Reward Shop',      desc: 'Redeem points for items' },
            { href: '/search',       icon: '🔍', title: 'Player Search',    desc: 'Lookup player statistics' },
            { href: '/upcoming',     icon: '📅', title: 'Event Calendar',   desc: 'Upcoming league scrims' },
          ].map(card => (
            <Link key={card.href} href={card.href}>
              <div className="card" style={{ textAlign: 'left', cursor: 'pointer', height: '100%' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: '#fff' }}>{card.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>{card.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 60, fontWeight: 500 }}>
          VBLL Scrim Infrastructure • v2.0 Platform
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px var(--accent)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 25px var(--accent)); }
        }
      `}</style>
    </main>
  );
}
