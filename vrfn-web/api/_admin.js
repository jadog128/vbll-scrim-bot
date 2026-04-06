const GUILD_ID = process.env.GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_TOKEN;

module.exports = async (userId) => {
  if (!userId || !GUILD_ID || !BOT_TOKEN) return false;

  try {
    const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });

    if (!response.ok) return false;
    const member = await response.json();
    
    // For now, any role in the guild = admin (same as check-admin.js)
    return member.roles && member.roles.length > 0;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
};
