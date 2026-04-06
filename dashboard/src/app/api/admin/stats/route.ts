import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_URL || 'libsql://vrdl-scrim-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
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
