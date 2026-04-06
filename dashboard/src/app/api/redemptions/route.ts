import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { all } from '@/lib/db';

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.isManagement) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await all(`
    SELECT r.id, r.discord_id, r.username, r.item_name, r.cost, r.status,
           r.public_id, r.player_game_id, r.created_at, r.reviewer_id
    FROM scrim_redemptions r
    ORDER BY r.id DESC
    LIMIT 50
  `);
  return NextResponse.json(rows);
}
