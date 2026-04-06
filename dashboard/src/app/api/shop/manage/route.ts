import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { run, get } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isManagement) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    action: 'restock' | 'remove-stock' | 'add-item' | 'remove-item';
    itemId?: number;
    amount?: number;
    name?: string;
    description?: string;
    cost?: number;
    stock?: number;
  };

  const { action, itemId, amount } = body;

  if (action === 'restock' && itemId && amount) {
    const item = await get<{ stock: number; name: string }>('SELECT stock, name FROM scrim_shop WHERE id=?', [itemId]);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const newStock = (item.stock === -1 ? 0 : item.stock) + amount;
    await run('UPDATE scrim_shop SET stock=? WHERE id=?', [newStock, itemId]);
    return NextResponse.json({ ok: true, newStock });
  }

  if (action === 'remove-stock' && itemId && amount) {
    const item = await get<{ stock: number; name: string }>('SELECT stock, name FROM scrim_shop WHERE id=?', [itemId]);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (item.stock === -1) return NextResponse.json({ error: 'Unlimited stock item' }, { status: 400 });
    const newStock = Math.max(0, item.stock - amount);
    await run('UPDATE scrim_shop SET stock=? WHERE id=?', [newStock, itemId]);
    return NextResponse.json({ ok: true, newStock });
  }

  if (action === 'add-item') {
    const { name, description, cost, stock = -1 } = body;
    if (!name || !description || !cost) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    await run('INSERT INTO scrim_shop (name, description, cost, stock) VALUES (?,?,?,?)', [name, description, cost, stock]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'remove-item' && itemId) {
    await run('UPDATE scrim_shop SET active=0 WHERE id=?', [itemId]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
