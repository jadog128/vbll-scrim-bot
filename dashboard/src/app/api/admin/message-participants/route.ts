import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_URL || 'libsql://vrdl-scrim-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scrimId, message } = await req.json();
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.SCRIM_DISCORD_TOKEN;

  if (!BOT_TOKEN) return NextResponse.json({ error: 'Config missing' }, { status: 500 });
  
  try {
    const res = await turso.execute({
      sql: 'SELECT discord_id FROM scrim_participants WHERE scrim_id=?',
      args: [scrimId]
    });
    const participants = res.rows.map(row => String(row.discord_id));
    
    let success = 0;
    for (const id of participants) {
      try {
        const dmRes = await fetch(`https://discord.com/api/users/@me/channels`, {
          method: 'POST',
          headers: { 
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recipient_id: id })
        });
        const dmChannel = await dmRes.json();
        
        await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: `📢 **Message from Management:**\n\n${message}` })
        });
        success++;
      } catch (_) {}
    }
    
    return NextResponse.json({ success: true, count: success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
