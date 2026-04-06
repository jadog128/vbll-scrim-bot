import { NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET() {
  const rows = await all(`
    SELECT id, title, time, reward, active, created_at
    FROM scrim_upcoming
    WHERE active = 1
    ORDER BY id DESC
    LIMIT 20
  `);
  return NextResponse.json(rows);
}
