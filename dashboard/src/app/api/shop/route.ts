import { NextResponse } from 'next/server';
import { all } from '@/lib/db';

export async function GET() {
  const rows = await all(`
    SELECT id, name, description, cost, stock
    FROM scrim_shop
    ORDER BY cost ASC
  `);
  return NextResponse.json(rows);
}
