import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ',
});

export async function POST(req: NextRequest) {
  const session = await getAuth();
  if (!session?.user?.isManagement) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, time, points } = await req.json();
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.SCRIM_DISCORD_TOKEN;
  const SCRIM_CHANNEL_ID = '1212823621005869106'; // Defaulting for now, should be from settings
  
  if (!BOT_TOKEN) return NextResponse.json({ error: 'Config missing' }, { status: 500 });
  
  try {
    const res = await turso.execute({
      sql: 'INSERT INTO scrim_upcoming (title, time, reward) VALUES (?,?,?)',
      args: [title, time, points]
    });
    const scrimId = Number(res.lastInsertRowid);
    
    // Post to discord via bot API directly from Dashboard if no bot integration channel exists
    // (Actually the bot can be notified via Turso if it polls, but let's just trigger a webhook or post)
    // For now, post via bot token to the main scrim channel
    
    const embed = {
      title: '⚽ VBLL Scrim Announcement',
      description: `**${title}**\n\n🕒 **Time:** ${time}\n⭐ **Reward:** ${points} pts\n\nClick "Join Scrim" in the server to sign up!`, // Link would be better
      color: 0x00f5a0
    };
    
    // Since we want the bot's button to work, we should ideally let the BOT post it.
    // If we want the bot to post it, we can't easily do it without a websocket.
    // However, I can post it with a button if I specify the customId in the payload.
    
    const body = {
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // Success
              label: 'Join Scrim',
              custom_id: `scrim_join_${scrimId}`
            }
          ]
        }
      ]
    };

    // Need a channel ID to post to. I'll check settings table.
    const settingsRes = await turso.execute({ sql: "SELECT value FROM scrim_settings WHERE key='log_channel'", args: [] });
    const channelId = String(settingsRes.rows[0]?.value || SCRIM_CHANNEL_ID);
    
    await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
