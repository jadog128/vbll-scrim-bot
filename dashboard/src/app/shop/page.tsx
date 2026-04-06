'use client';

import { useEffect, useState } from 'react';

interface ShopItem { id: number; name: string; description: string; cost: number; stock: number; }

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); });
  }, []);

  return (
    <main className="page">
      <h1 className="page-title">🛍️ Scrim Shop</h1>
      <p className="page-subtitle">Use your scrim points to redeem items via the Discord bot with <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>/redeem</code></p>

      {loading ? (
        <div className="shop-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <p style={{ color: 'var(--muted)' }}>No items in the shop yet — check back soon!</p>
        </div>
      ) : (
        <div className="shop-grid">
          {items.map(item => {
            const outOfStock = item.stock === 0;
            return (
              <div key={item.id} className="shop-card" style={outOfStock ? { opacity: 0.5 } : {}}>
                <div className="shop-name">{item.name}</div>
                <div className="shop-desc">{item.description}</div>
                <div className="shop-meta">
                  <span className="shop-cost">⭐ {item.cost.toLocaleString()}</span>
                  <span className="shop-stock">
                    {item.stock === -1 ? '∞ Unlimited' : outOfStock ? '❌ Out of stock' : `📦 ${item.stock} left`}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  ID: <strong style={{ color: 'var(--text)' }}>#{item.id}</strong> — use <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>/redeem {item.id}</code> in Discord
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
