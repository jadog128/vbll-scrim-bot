import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await turso.execute({
      sql: 'SELECT "claim" as type, status, note, created_at FROM scrim_requests WHERE discord_id = ? ORDER BY created_at DESC LIMIT 5',
      args: [session.user.id]
    });

    return NextResponse.json({ notifications: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
