import { NextResponse } from 'next/server';
import { get } from '@/lib/db';

export async function GET() {
  try {
    // Check for "heartbeat" or last activity in settings or claims
    const lastActivity = await get(`
      SELECT key, value as last_update
      FROM scrim_settings 
      WHERE key = 'last_heartbeat'
      UNION ALL
      SELECT 'last_claim' as key, created_at as last_update
      FROM scrim_requests
      ORDER BY last_update DESC
      LIMIT 1
    `);

    if (!lastActivity) {
      return NextResponse.json({ online: false, lastSeen: null });
    }

    const lastSeen = new Date(lastActivity.last_update as string);
    const now = new Date();
    const diffMinutes = Math.abs((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    // If within last 15 mins, consider online
    const online = diffMinutes < 15;

    return NextResponse.json({ 
      online,
      lastSeen: lastActivity.last_update,
      diffMinutes: Math.round(diffMinutes)
    });
  } catch (error) {
    return NextResponse.json({ online: false, error: 'DB Error' });
  }
}
