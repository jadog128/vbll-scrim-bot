import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuth } from '@/lib/auth';
import { run, all } from '@/lib/db';

// GET: Fetch batch requests (with status filtering) or settings
export async function GET(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'requests' or 'settings'
  const filter = searchParams.get('filter'); // 'pending' or 'all'

  try {
    if (type === 'settings') {
      const rows = await all("SELECT key, value FROM batch_settings");
      const settings = Object.fromEntries(rows.map((row: any) => [row.key, row.value]));
      return NextResponse.json(settings);
    }

    const sql = filter === 'pending' 
      ? "SELECT * FROM batch_requests WHERE status IN ('pre_review', 'pending', 'approved') ORDER BY id ASC"
      : "SELECT * FROM batch_requests ORDER BY id DESC LIMIT 100";
    
    const requests = await all(sql);
    return NextResponse.json(requests);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Review requests OR update settings
export async function POST(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    if (body.type === 'settings') {
      const { key, value } = body;
      await run('INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?, ?)', [key, value]);
      return NextResponse.json({ success: true });
    }

    const { requestId, action } = body;
    let status = 'pending';
    if (action === 'approve') status = 'approved';
    else if (action === 'complete') status = 'completed';
    else if (action === 'reject') status = 'rejected';
    else if (action === 'verify') status = 'pending';
    
    await run('UPDATE batch_requests SET status = ?, staff_id = ? WHERE id = ?', [status, session.user.id, requestId]);

    // Send DM Notification via Bot's HTTP endpoint
    try {
      const rows = await all('SELECT discord_id, type FROM batch_requests WHERE id = ?', [requestId]);
      if (rows.length > 0) {
        const { discord_id: userId, type } = rows[0] as any;
        const botUrl = process.env.BATCH_BOT_URL || 'https://vbll-batcheron.onrender.com';
        await fetch(`${botUrl}/notify-dm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, status, type, id: requestId })
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to notify bot for DM:', e);
    }

    return NextResponse.json({ success: true, newStatus: status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
