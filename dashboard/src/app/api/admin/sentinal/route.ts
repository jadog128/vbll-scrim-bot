import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { run, all } from '@/lib/db';

// GET: Fetch logs or infractions
export async function GET(req: Request) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'logs', 'infractions', 'global'

  try {
    let sql = 'SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT 100';
    if (type === 'global') sql = 'SELECT * FROM mod_global_blacklist ORDER BY created_at DESC';
    if (type === 'infractions') sql = 'SELECT * FROM mod_infractions ORDER BY count DESC LIMIT 50';

    const data = await all(sql);
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
      await run('INSERT INTO mod_global_blacklist (discord_id, reason, staff_id) VALUES (?,?,?)', [userId, reason, session.user.id]);
      return NextResponse.json({ success: true });
    }

    if (action === 'remove-global') {
      await run('DELETE FROM mod_global_blacklist WHERE discord_id = ?', [userId]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
