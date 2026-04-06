import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { roleId, message } = await req.json();
  const GUILD_ID = process.env.DISCORD_GUILD_ID || '1212823621005869106';
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.SCRIM_DISCORD_TOKEN;

  if (!BOT_TOKEN) return NextResponse.json({ error: 'Config missing' }, { status: 500 });
  
  try {
    // Fetch all members (this requires the GUILD_MEMBERS intent for the bot)
    const membersRes = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members?limit=1000`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
    const members: any[] = await membersRes.json();
    
    const targetMembers = members.filter(m => m.roles.includes(roleId) && !m.user?.bot);
    
    let success = 0;
    for (const m of targetMembers) {
      try {
        // Create DM channel
        const dmRes = await fetch(`https://discord.com/api/users/@me/channels`, {
          method: 'POST',
          headers: { 
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recipient_id: m.user.id })
        });
        const dmChannel = await dmRes.json();
        
        // Send message
        await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: message })
        });
        success++;
      } catch (_) {}
    }
    
    return NextResponse.json({ success: true, count: success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
