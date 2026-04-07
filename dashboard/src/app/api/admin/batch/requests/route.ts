import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2BeLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw',
});

// GET: Fetch batch requests (with status filtering) or settings
export async function GET(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'requests' or 'settings'
  const filter = searchParams.get('filter'); // 'pending' or 'all'

  try {
    if (type === 'settings') {
      const res = await turso.execute("SELECT key, value FROM batch_settings");
      const settings = Object.fromEntries(res.rows.map(row => [row[0], row[1]]));
      return NextResponse.json(settings);
    }

    const sql = filter === 'pending' 
      ? "SELECT * FROM batch_requests WHERE status IN ('pending', 'approved') ORDER BY id ASC"
      : "SELECT * FROM batch_requests ORDER BY id DESC LIMIT 100";
    
    const res = await turso.execute(sql);
    const requests = res.rows.map(row => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
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
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?, ?)',
        args: [key, value]
      });
      return NextResponse.json({ success: true });
    }

    const { requestId, action } = body;
    const status = action === 'approve' ? 'approved' : action === 'complete' ? 'completed' : 'rejected';
    
    await turso.execute({
      sql: 'UPDATE batch_requests SET status = ?, staff_id = ? WHERE id = ?',
      args: [status, session.user.id, requestId]
    });

    return NextResponse.json({ success: true, newStatus: status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
