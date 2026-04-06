import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { discordId, points } = await req.json();
  if (isNaN(points)) return NextResponse.json({ error: 'Invalid points' }, { status: 400 });

  try {
    // Check if user exists
    const userRes = await turso.execute({ sql: 'SELECT * FROM scrim_stats WHERE discord_id=?', args: [discordId] });
    if (!userRes.rows.length) {
      // Create user if doesn't exist
      await turso.execute({ sql: 'INSERT INTO scrim_stats (discord_id, points, username) VALUES (?,?,?)', args: [discordId, points, 'Unknown (New)'] });
    } else {
      await turso.execute({ sql: 'UPDATE scrim_stats SET points=? WHERE discord_id=?', args: [points, discordId] });
    }
    
    // Audit log this change
    await turso.execute({ 
      sql: 'INSERT INTO scrim_audit (discord_id, action, details) VALUES (?,?,?)', 
      args: [session.user.discordId, 'Update Points', `User ${discordId} set to ${points} pts`] 
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
