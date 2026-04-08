'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    console.log('Login sequence initiated...');
    // Direct redirect fallback to bypass potential JS client issues
    window.location.href = '/api/auth/signin/discord';
  };

  return (
    <div className="page" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '80vh' 
    }}>
      <div className="glass-card" style={{ 
        maxWidth: 450, 
        width: '100%', 
        textAlign: 'center',
        padding: '50px'
      }}>
        <div style={{ 
          fontSize: 64, 
          marginBottom: 20,
          filter: 'drop-shadow(0 0 15px var(--accent-glow))' 
        }}>🛡️</div>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>VCC Admin Hub</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 40, fontSize: 16 }}>
          Premium authorization for VCC League Staff.
        </p>
        
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '18px' }}
          disabled={loading}
          onClick={handleLogin}
        >
          {loading ? 'Connecting...' : 'Login with Discord'}
        </button>
        
        <p style={{ marginTop: 30, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Secure Terminal Access v2.4.0
        </p>
      </div>
    </div>
  );
}
