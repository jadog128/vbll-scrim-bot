import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) return NextResponse.json({ players: [], items: [] });

  try {
    const [playersRes, itemsRes] = await Promise.all([
      turso.execute({
        sql: 'SELECT discord_id as discordId, username, points FROM scrim_stats WHERE username LIKE ? LIMIT 5',
        args: [`%${q}%`]
      }),
      turso.execute({
        sql: 'SELECT id, name, cost FROM scrim_shop WHERE name LIKE ? LIMIT 3',
        args: [`%${q}%`]
      })
    ]);

    return NextResponse.json({
      players: playersRes.rows,
      items: itemsRes.rows
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
