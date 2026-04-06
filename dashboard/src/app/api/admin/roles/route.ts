import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';

export async function GET() {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const GUILD_ID = process.env.DISCORD_GUILD_ID || '1212823621005869106';
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.SCRIM_DISCORD_TOKEN;

  if (!BOT_TOKEN) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

  try {
    const res = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
    const roles: any[] = await res.json();
    
    // Return relevant roles only (non-managed, non-everyone)
    const filteredRoles = roles
      .filter(r => r.name !== '@everyone' && !r.managed)
      .map(r => ({ id: r.id, name: r.name }));
      
    return NextResponse.json({ roles: filteredRoles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
