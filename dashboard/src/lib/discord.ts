import { run, all } from "./db";

const BOT_TOKEN = process.env.BATCH_DISCORD_TOKEN || process.env.SCRIM_DISCORD_TOKEN || process.env.DISCORD_TOKEN;
if (!BOT_TOKEN) console.warn("⚠️ [DISCORD] BOT_TOKEN is missing in current environment.");

const GUILD_ID = process.env.BATCH_GUILD_ID || "1286206719847960670";

export async function sendDiscordDM(userId: string, content: any) {
  if (!BOT_TOKEN) return;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000);
  try {
    const dmRes = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: userId }),
      signal: controller.signal
    });
    if (!dmRes.ok) {
        clearTimeout(id);
        return;
    }
    const dmChannel = await dmRes.json();
    await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(content),
      signal: controller.signal
    });
    clearTimeout(id);
  } catch (e) {
    clearTimeout(id);
  }
}

export async function deleteDiscordMessage(channelId: string, messageId: string) {
  if (!BOT_TOKEN) return;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      signal: controller.signal
    });
    clearTimeout(id);
  } catch (e) {
    clearTimeout(id);
  }
}

export async function sendDiscordMessage(channelId: string, content: any) {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(content),
      signal: controller.signal
    });
    if (!res.ok) {
        clearTimeout(id);
        return;
    }
    clearTimeout(id);
    return await res.json();
  } catch (e: any) {
    clearTimeout(id);
  }
}
