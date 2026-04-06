import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const players = await all(`
      SELECT discord_id, username, points
      FROM scrim_points
      WHERE discord_id = ? OR username LIKE ?
      LIMIT 10
    `, [query, `%${query}%`]);

    return NextResponse.json(players);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
