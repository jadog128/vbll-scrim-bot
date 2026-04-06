import { NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET() {
  const rows = await all(`
    SELECT id, name, description, cost, stock, active
    FROM scrim_shop
    WHERE active = 1
    ORDER BY cost ASC
  `);
  return NextResponse.json(rows);
}
