import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2BeLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw',
});

// GET: Fetch pending batch requests
export async function GET() {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await turso.execute("SELECT * FROM batch_requests WHERE status IN ('pending', 'approved') ORDER BY id ASC");
    const requests = res.rows.map(row => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
    return NextResponse.json(requests);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Review (Approve, Complete, Reject) a batch request
export async function POST(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { requestId, action } = await req.json();
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
