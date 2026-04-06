import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU0ODk0MjQsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.ciGvUbBN0KRs5JefCtTvfvVMCpaWfUXsk_86-Qmsx7bGdmX4ixjD7TBzB8nx2SrE6bEh-vjiKfPYM0T6MuaWAQs',
});

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [playersRes, claimsRes, pointsRes, scrimsRes] = await Promise.all([
      turso.execute('SELECT COUNT(*) as count FROM scrim_stats'),
      turso.execute("SELECT COUNT(*) as count FROM scrim_requests WHERE status='pending'"),
      turso.execute('SELECT SUM(points) as total FROM scrim_stats'),
      turso.execute('SELECT COUNT(*) as count FROM scrim_upcoming WHERE active=1')
    ]);

    return NextResponse.json({
      totalUsers: Number(playersRes.rows[0].count),
      pendingClaims: Number(claimsRes.rows[0].count),
      totalPoints: Number(pointsRes.rows[0].total) || 0,
      activeScrims: Number(scrimsRes.rows[0].count)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
