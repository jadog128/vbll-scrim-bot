import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.MOD_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.MOD_TURSO_TOKEN || 'eyJlbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw',
});

// GET: Fetch logs or infractions
export async function GET(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'logs', 'infractions', 'global'

  try {
    if (type === 'global') {
      const res = await turso.execute('SELECT * FROM mod_global_blacklist ORDER BY created_at DESC');
      const data = res.rows.map(row => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
      return NextResponse.json(data);
    }

    if (type === 'infractions') {
      const res = await turso.execute('SELECT * FROM mod_infractions ORDER BY count DESC LIMIT 50');
      const data = res.rows.map(row => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
      return NextResponse.json(data);
    }

    // Default: Logs
    const res = await turso.execute('SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT 100');
    const data = res.rows.map(row => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Manage global blacklist or trigger Panic Button
export async function POST(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, userId, reason } = await req.json();

    if (action === 'global-ban') {
      await turso.execute({
        sql: 'INSERT INTO mod_global_blacklist (discord_id, reason, staff_id) VALUES (?,?,?)',
        args: [userId, reason, session.user.id]
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'remove-global') {
      await turso.execute({
        sql: 'DELETE FROM mod_global_blacklist WHERE discord_id = ?',
        args: [userId]
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
