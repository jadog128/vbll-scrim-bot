import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { all, get } from '@/lib/db';

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const discordId = session.user.discordId;

  try {
    // 1. Get Points and Rank (simple rank calc)
    const allUsers = await all<{ discord_id: string, points: number }>(
      'SELECT discord_id, points FROM scrim_points ORDER BY points DESC'
    );
    
    const userIndex = allUsers.findIndex(u => u.discord_id === discordId);
    const rank = userIndex !== -1 ? userIndex + 1 : null;
    const points = allUsers[userIndex]?.points || 0;

    // 2. Get Recent Requests (Points Claims)
    const requests = await all(
      'SELECT id, amount, description, status, created_at FROM scrim_requests WHERE discord_id = ? ORDER BY created_at DESC LIMIT 10',
      [discordId]
    );

    // 3. Get Recent Redemptions
    const redemptions = await all(
      'SELECT id, item_name, cost, status, created_at FROM scrim_redemptions WHERE discord_id = ? ORDER BY created_at DESC LIMIT 10',
      [discordId]
    );

    return NextResponse.json({
      points,
      rank,
      requests,
      redemptions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
