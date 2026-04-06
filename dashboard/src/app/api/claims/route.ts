import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { all } from '@/lib/db';

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.isManagement) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rows = await all(`
    SELECT id, discord_id, username, amount, description, proof_url, status, created_at
    FROM scrim_requests
    WHERE status = 'pending'
    ORDER BY id DESC
    LIMIT 50
  `);
  return NextResponse.json(rows);
}
