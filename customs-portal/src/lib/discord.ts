import { execute } from "./db";
const BOT_TOKEN = process.env.VBLL_DISCORD_TOKEN || process.env.BATCH_DISCORD_TOKEN;
const GUILD_ID = process.env.VBLL_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID;
const ADMIN_ROLE_ID = process.env.VBLL_ADMIN_ROLE_ID || process.env.ADMIN_ROLE_ID;

export async function updateDiscordMessage(channelId: string, messageId: string, content: any) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      headers: { 
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(content)
    });
  } catch (e) {}
}

export async function deleteDiscordMessage(channelId: string, messageId: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
  } catch (e) {}
}

export async function sendDiscordMessage(channelId: string, content: any) {
    if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { 
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(content)
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Discord API Error: ${res.status} - ${err}`);
    }
    return await res.json();
}

export async function getSettingFromDB(key: string) {
    const res = await execute("SELECT value FROM batch_settings WHERE key = ?", [key]);
    return res.rows.length > 0 ? (res.rows[0] as any).value : null;
}

export async function isMemberAdmin(userId: string): Promise<boolean> {
    // Hardcoded owner IDs for backup
    const owners = ['1139955783384187031', '1145402830786678884'];
    if (owners.includes(userId)) return true;
  
    if (!BOT_TOKEN || !GUILD_ID || !ADMIN_ROLE_ID) return false;
  
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (!res.ok) return false;
      const member = await res.json();
      return member.roles.includes(ADMIN_ROLE_ID) || member.permissions?.includes('8'); // 8 is Administrator
    } catch (e) {
      return false;
    }
  }
