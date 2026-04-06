'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ShopItem { id: number; name: string; description: string; cost: number; stock: number; }

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

export default function AdminShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Restock / remove-stock inputs per item
  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});

  // Add item form
  const [form, setForm] = useState({ name: '', description: '', cost: '', stock: '' });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && !session?.user?.isManagement) { router.push('/'); return; }
    if (status === 'authenticated') fetchItems();
  }, [status, session, fetchItems, router]);

  const shopAction = async (action: string, itemId?: number, amount?: number) => {
    const res = await fetch('/api/shop/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, itemId, amount }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`✅ Done! ${action === 'restock' ? `New stock: ${data.newStock}` : action === 'remove-stock' ? `New stock: ${data.newStock}` : ''}`, 'success');
      fetchItems();
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  };

  const addItem = async () => {
    if (!form.name || !form.description || !form.cost) {
      showToast('Name, description and cost are required.', 'error');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/shop/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-item',
        name: form.name,
        description: form.description,
        cost: parseInt(form.cost),
        stock: form.stock ? parseInt(form.stock) : -1,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      showToast('✅ Item added!', 'success');
      setForm({ name: '', description: '', cost: '', stock: '' });
      setShowAdd(false);
      fetchItems();
    } else {
      const d = await res.json();
      showToast(`Error: ${d.error}`, 'error');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="page">
        <h1 className="page-title">⚙️ Manage Shop</h1>
        <div className="shop-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page-title">⚙️ Manage Shop</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={fetchItems}>🔄 Refresh</button>
          <button className="btn btn-accent" onClick={() => setShowAdd(true)}>+ Add Item</button>
        </div>
      </div>
      <p className="page-subtitle">Add new items, restock, adjust or remove existing shop items</p>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">➕ Add Shop Item</div>

            <div className="form-group">
              <label>Item Name</label>
              <input
                placeholder="e.g. Custom Role Colour"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={2}
                placeholder="e.g. Get a custom colour for your Discord role"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cost (pts)</label>
                <input
                  type="number" min={1}
                  placeholder="500"
                  value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Stock (-1 = unlimited)</label>
                <input
                  type="number" min={-1}
                  placeholder="-1"
                  value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-accent" onClick={addItem} disabled={submitting} style={{ flex: 1 }}>
                {submitting ? '⏳ Adding…' : '✅ Add Item'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: 'var(--muted)' }}>No shop items yet. Click &quot;+ Add Item&quot; to create one.</p>
        </div>
      ) : (
        <div className="shop-grid">
          {items.map(item => (
            <div key={item.id} className="shop-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="shop-name">{item.name}</div>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>#{item.id}</span>
              </div>
              <div className="shop-desc">{item.description}</div>
              <div className="shop-meta">
                <span className="shop-cost">⭐ {item.cost}</span>
                <span className="shop-stock" style={{ color: item.stock === 0 ? 'var(--red)' : 'var(--muted)' }}>
                  {item.stock === -1 ? '∞ Unlimited' : item.stock === 0 ? '❌ Out of stock' : `📦 ${item.stock} left`}
                </span>
              </div>

              {/* Stock controls */}
              {item.stock !== -1 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number" min={1}
                    placeholder="Qty"
                    value={stockInputs[item.id] ?? ''}
                    onChange={e => setStockInputs(s => ({ ...s, [item.id]: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                  />
                  <button className="btn btn-green" style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => {
                      const n = parseInt(stockInputs[item.id]);
                      if (!n || n < 1) { showToast('Enter a valid quantity', 'error'); return; }
                      shopAction('restock', item.id, n);
                      setStockInputs(s => ({ ...s, [item.id]: '' }));
                    }}>
                    +Stock
                  </button>
                  <button className="btn btn-red" style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => {
                      const n = parseInt(stockInputs[item.id]);
                      if (!n || n < 1) { showToast('Enter a valid quantity', 'error'); return; }
                      shopAction('remove-stock', item.id, n);
                      setStockInputs(s => ({ ...s, [item.id]: '' }));
                    }}>
                    -Stock
                  </button>
                </div>
              )}

              <button
                className="btn btn-red"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                onClick={() => {
                  if (confirm(`Remove "${item.name}" from the shop?`)) shopAction('remove-item', item.id);
                }}>
                🗑️ Remove Item
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </main>
  );
}
