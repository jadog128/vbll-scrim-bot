import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_URL || 'libsql://vrdl-scrim-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { settings } = await req.json();

  try {
    for (const [key, value] of Object.entries(settings)) {
      await turso.execute({ 
        sql: 'UPDATE scrim_settings SET value=? WHERE key=?', 
        args: [String(value), key] 
      });
    }

    // Audit Log the update
    await turso.execute({
      sql: 'INSERT INTO scrim_audit (discord_id, action, details) VALUES (?,?,?)',
      args: [session.user.discordId, 'Update Settings', `Global settings updated by dashboard`]
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
