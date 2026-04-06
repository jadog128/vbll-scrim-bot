import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { run, get } from '@/lib/db';

async function getPoints(id: string): Promise<number> {
  const row = await get<{ points: number }>('SELECT points FROM scrim_points WHERE discord_id=?', [id]);
  return row ? Number(row.points) : 0;
}

async function ensurePlayer(id: string, username: string) {
  await run('INSERT OR IGNORE INTO scrim_points (discord_id, username, points) VALUES (?,?,0)', [id, username]);
  await run('UPDATE scrim_points SET username=? WHERE discord_id=?', [username, id]);
}

async function addPoints(id: string, username: string, amount: number) {
  await ensurePlayer(id, username);
  const current = await getPoints(id);
  await run('UPDATE scrim_points SET points = ? WHERE discord_id=?', [current + amount, id]);
}

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isManagement) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claimId, action } = await req.json() as { claimId: number; action: 'approve' | 'reject' };
  if (!claimId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const claim = await get<{ id: number; discord_id: string; username: string; amount: number; status: string }>(
    'SELECT * FROM scrim_requests WHERE id=?', [claimId]
  );

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (claim.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });

  const reviewerId = session.user.discordId;

  if (action === 'approve') {
    await addPoints(claim.discord_id, claim.username, claim.amount);
    await run(
      `UPDATE scrim_requests SET status='approved', reviewer_id=? WHERE id=?`,
      [reviewerId, claimId]
    );
    return NextResponse.json({ ok: true, newPoints: await getPoints(claim.discord_id) });
  } else {
    await run(
      `UPDATE scrim_requests SET status='rejected', reviewer_id=? WHERE id=?`,
      [reviewerId, claimId]
    );
    return NextResponse.json({ ok: true });
  }
}
