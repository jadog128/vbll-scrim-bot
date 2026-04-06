import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_URL || 'libsql://vrdl-scrim-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function GET(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ users: [] });

  try {
    const res = await turso.execute({
      sql: 'SELECT * FROM scrim_stats WHERE discord_id LIKE ? OR username LIKE ? LIMIT 50',
      args: [`%${query}%`, `%${query}%`]
    });
    const users = res.rows.map(row => ({
      discord_id: String(row.discord_id),
      username: String(row.username),
      points: Number(row.points)
    }));
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
