'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="page" style={{ textAlign: 'center' }}>
      <div className="mesh-container">
        <h1 className="page-title" style={{ fontSize: 'min(11vw, 7.5rem)', color: 'var(--text)' }}>
          VBLL│<span className="liquid-pill"></span> HUB
        </h1>
        
        <p className="page-subtitle" style={{ maxWidth: 800, margin: '2rem auto', fontSize: '1.2rem' }}>
          The unified infrastructure for VBLL. Manage your scrim performance, 
          track point rankings, and request premium customs from one central location.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 32, 
          maxWidth: 1000, 
          margin: '4rem auto',
          padding: '0 20px'
        }}>
          {/* Scrim Hub Portal */}
          <Link href="/leaderboard" className="portal-card">
            <div className="portal-icon">🏆</div>
            <h2 className="portal-title">Scrim Hub</h2>
            <p className="portal-desc">View global rankings, track your points history, and browse the reward shop.</p>
            <div className="btn btn-accent" style={{ width: '100%', marginTop: 'auto' }}>Enter Scrim Hub</div>
          </Link>

          {/* Customs Hub Portal */}
          <div className="portal-card" style={{ border: '1px solid var(--accent2-glow)' }}>
            <div className="portal-icon">👕</div>
            <h2 className="portal-title">Customs Hub</h2>
            <p className="portal-desc">Request custom jerseys, shoes, and gear. Track your batch order status live.</p>
            <Link href="/shop" className="btn btn-ghost" style={{ width: '100%', marginTop: 'auto', color: 'var(--accent2)' }}>Request Customs</Link>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, textAlign: 'left' }}>
          <div className="card">
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📊</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>Elite Stats</h3>
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
            <h3 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>Unified Staff</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Management tools to coordinate both scrim rewards and complex custom item batching.
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
