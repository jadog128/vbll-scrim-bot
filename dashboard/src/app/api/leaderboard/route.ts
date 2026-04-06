import { NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET() {
  const rows = await all(`
    SELECT discord_id, username, points
    FROM scrim_points
    ORDER BY points DESC
    LIMIT 25
  `);
  return NextResponse.json(rows);
}
