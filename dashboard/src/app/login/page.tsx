'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">VRDL Scrim Hub</div>
        <p className="login-sub">
          Sign in with your Discord account to access staff tools, approve point claims and manage the shop.
        </p>

        <div style={{ padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Only members with the <strong style={{ color: 'var(--text)' }}>VRDL | Scrim Management</strong> role will see staff tools.
          </p>
        </div>

        <button className="discord-btn" onClick={() => signIn('discord', { callbackUrl: '/admin/claims' })}>
          <svg className="discord-icon" viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.5 37.5 0 0 0 25.5.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 30.9.3 43.5a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.8a.2.2 0 0 1 .2 0c11.6 5.3 24.1 5.3 35.6 0a.2.2 0 0 1 .2 0l1.1.8a.2.2 0 0 1 0 .4 36 36 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47 47 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.6 58.6 0 0 0 17.8-9 .2.2 0 0 0 .1-.2c1.5-15.2-2.5-28-10.5-39.6a.2.2 0 0 0-.1-.1zM23.7 35.8c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1zm23.7 0c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1z"/>
          </svg>
          Sign in with Discord
        </button>

        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Your Discord credentials are handled securely by Discord OAuth. We never see your password.
        </p>
      </div>
    </div>
  );
}
