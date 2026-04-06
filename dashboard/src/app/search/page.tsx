'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface SearchResult {
  discord_id: string;
  username: string;
  points: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        setLoading(true);
        fetch(`/api/user/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            setResults(data);
            setLoading(false);
          });
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <main className="page">
      <div className="section">
        <h1 className="page-title">🔍 Player Search</h1>
        <p className="page-subtitle">Lookup any player by Username or Discord ID</p>

        <div className="card" style={{ marginBottom: 32 }}>
          <input 
            type="text" 
            placeholder="Enter username or discord id..." 
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', fontSize: 16, padding: '12px 16px' }}
          />
        </div>

        {loading && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Searching...</p>}

        {!loading && query.length >= 2 && results.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)' }}>No players found matching "{query}"</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {results.map(p => (
            <div key={p.discord_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{p.username}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>ID: {p.discord_id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 20 }}>{p.points.toLocaleString()} pts</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Scrim Points Balance</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
