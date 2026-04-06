'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="page" style={{ textAlign: 'center' }}>
      <div className="mesh-container">
        <h1 className="page-title" style={{ fontSize: 'min(11vw, 7.5rem)', color: 'var(--text)' }}>
          Virtual <span className="liquid-pill"></span> Football<br/>is VBLL
        </h1>
        
        <p className="page-subtitle" style={{ maxWidth: 800, margin: '2rem auto', fontSize: '1.2rem' }}>
          The professional infrastructure for the Virtual Football League. 
          Real-time points tracking, automated rewards, and premium scrim management.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
          <Link href="/leaderboard" className="btn btn-accent">View Leaderboard</Link>
          <Link href="/shop" className="btn btn-ghost">Visit Reward Shop</Link>
        </div>

        <div className="metric-grid" style={{ marginTop: '10rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
          <div className="card">
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📊</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>Elite Scrims</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Join high-stakes scrims and automatically track your performance for league rankings.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⭐</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>Global Rewards</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Earn points for your skills and redeem them for exclusive Discord roles, status, and items.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🛡️</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>Staff Hub</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Powerful management tools for league hosts to coordinate mass DMs and scrim announcements.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .liquid-pill {
          display: inline-block;
          vertical-align: middle;
          width: min(22vw, 220px);
          height: min(9vw, 90px);
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, rgba(77, 166, 255, 0.15), rgba(0, 212, 255, 0.3));
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 4px 15px rgba(255,255,255,0.4), 0 10px 30px rgba(0,0,0,0.05);
          margin: 0 1rem;
          border: 1px solid rgba(255,255,255,0.5);
          animation: liquid-morph 8s ease-in-out infinite;
        }

        @keyframes liquid-morph {
          0%, 100% { border-radius: 100px; }
          50% { border-radius: 80px 120px 90px 110px / 110px 90px 120px 80px; }
        }

        .liquid-pill::before {
          content: '';
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at center, var(--accent) 0%, transparent 50%);
          opacity: 0.6;
          filter: blur(20px);
          animation: rotating 15s linear infinite;
        }

        @keyframes rotating {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
