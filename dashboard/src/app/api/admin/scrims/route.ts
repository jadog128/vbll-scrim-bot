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
    const res = await turso.execute('SELECT id, title, time FROM scrim_upcoming WHERE active=1 ORDER BY created_at DESC LIMIT 50');
    const scrims = res.rows.map(row => ({
      id: Number(row.id),
      title: String(row.title),
      time: String(row.time)
    }));
    return NextResponse.json({ scrims });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
