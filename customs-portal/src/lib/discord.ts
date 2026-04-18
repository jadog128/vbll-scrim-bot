const BOT_TOKEN = process.env.VBLL_DISCORD_TOKEN || process.env.BATCH_DISCORD_TOKEN;
const GUILD_ID = process.env.VBLL_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID;
const ADMIN_ROLE_ID = process.env.VBLL_ADMIN_ROLE_ID || process.env.ADMIN_ROLE_ID;

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
